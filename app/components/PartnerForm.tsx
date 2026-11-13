"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mark } from "./Mark";

/* The partner form, ported from the homepage's inline script and HOSTING.md,
   with the PR C state machine. It opens the visitor's email app by default
   (the form's action is a mailto: link, so it also works without
   JavaScript). Once a Formspree form ID is set in FORMSPREE_ID below, it
   posts there instead; then the privacy lines next to the form and on the
   Limits page must say submissions go to Formspree (the static site's
   check_site.py enforces that agreement).

   States, each reported honestly (playbook section 13, law 20 and rule C1):
   idle, composing (the mailto hand-off is the step, shown while it happens),
   sending (the Formspree POST is in flight; a progress bar shows the step,
   never a percentage), error (the POST failed; the form stays, the note
   carries the failure and the fallback address), and sent (the form box
   itself becomes the confirmation, same cell, same width, its height
   animated by framer-motion's layout system). Field errors live at the
   field, in the error colour, which means error and nothing else. */
const FORMSPREE_ID = "";
const FALLBACK_EMAIL = "rohansiddam@synthe.live";

type SendState =
  | { kind: "idle" }
  | { kind: "composing" }
  | { kind: "sending" }
  | { kind: "error" }
  | { kind: "sent"; email: string };

const EASE_UI: [number, number, number, number] = [0.25, 1, 0.5, 1];

export function PartnerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [send, setSend] = useState<SendState>({ kind: "idle" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState<React.ReactNode>("");
  /* The confirmation never shrinks below the height the form occupied. */
  const [boxMinHeight, setBoxMinHeight] = useState<number | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  const busy = send.kind === "composing" || send.kind === "sending";
  const submitLabel =
    send.kind === "sending"
      ? "Sending…"
      : send.kind === "composing"
        ? "Opening…"
        : send.kind === "error"
          ? "Try again"
          : "Talk to us";

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* Move focus to the confirmation when it replaces the form. */
  useEffect(() => {
    if (send.kind === "sent") doneRef.current?.focus({ preventScroll: true });
  }, [send.kind]);

  const emailEl = () => formRef.current?.elements.namedItem("email") as HTMLInputElement | null;

  const validate = (el: HTMLInputElement | null): string | null => {
    if (!el) return null;
    if (!el.value.trim()) return "Enter your work email.";
    if (!el.checkValidity()) return "That email address doesn't look complete.";
    return null;
  };

  const onBlur = () => {
    setTouched(true);
    setEmailError(validate(emailEl()));
  };

  const onChange = () => {
    if (emailError) setEmailError(validate(emailEl()));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form || busy || send.kind === "sent") return;
    const el = emailEl();
    const gotcha = form.elements.namedItem("_gotcha") as HTMLInputElement;
    const error = validate(el);
    if (error || !el) {
      setTouched(true);
      setEmailError(error ?? "Enter your work email.");
      el?.focus();
      return;
    }
    if (gotcha.value) return;
    const email = el.value.trim();
    setEmailError(null);
    setNote("");

    const configured = /^[A-Za-z0-9]+$/.test(FORMSPREE_ID);
    if (!configured || !window.fetch) {
      /* The mailto path: composing the note in the visitor's email app is
         the one real step, so it is the step the progress state names. The
         short delay lets that state paint before the hand-off. */
      setSend({ kind: "composing" });
      const body =
        "Hi,\n\nWe use AI agents in production and would like to talk.\n\nMy email: " + email + "\n";
      timer.current = window.setTimeout(() => {
        window.location.href =
          "mailto:" +
          FALLBACK_EMAIL +
          "?subject=" +
          encodeURIComponent("Hello from synthe.live") +
          "&body=" +
          encodeURIComponent(body);
        setSend({ kind: "idle" });
        setNote("Opening your email app with the note ready to send.");
      }, 450);
      return;
    }

    setSend({ kind: "sending" });
    fetch("https://formspree.io/f/" + FORMSPREE_ID, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error("status " + r.status);
        if (wrapRef.current) setBoxMinHeight(wrapRef.current.offsetHeight);
        setSend({ kind: "sent", email });
      })
      .catch(() => {
        setSend({ kind: "error" });
      });
  };

  const reset = () => {
    setSend({ kind: "idle" });
    setBoxMinHeight(undefined);
    setTouched(false);
    setEmailError(null);
    setNote("");
  };

  const swap = reduceMotion ? 0 : 0.25;
  const childMotion = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
    transition: { duration: swap, ease: EASE_UI },
  };

  return (
    <>
      <motion.div
        className="partner-box"
        layout
        transition={{ layout: { duration: reduceMotion ? 0 : 0.32, ease: EASE_UI } }}
        style={{ minHeight: boxMinHeight }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {send.kind === "sent" ? (
            <motion.div
              key="done"
              className="partner-done"
              ref={doneRef}
              tabIndex={-1}
              {...childMotion}
            >
              <p className="done-label">Partner request</p>
              <p className="done-line">
                <span className="done-word">Kept</span>
                <span>Talk about AI agents in production</span>
              </p>
              <p className="done-sub">We'll be in touch at {send.email}.</p>
              <button className="btn2" type="button" onClick={reset}>
                Use a different email
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" ref={wrapRef} {...childMotion}>
              <form
                className="partner-form"
                id="partner-form"
                action="mailto:rohansiddam@synthe.live?subject=Hello%20from%20synthe.live"
                method="post"
                encType="text/plain"
                data-formspree={FORMSPREE_ID}
                data-fallback-email={FALLBACK_EMAIL}
                ref={formRef}
                onSubmit={onSubmit}
                noValidate
              >
                <div className="field">
                  <label htmlFor="partner-email">Work email</label>
                  <input
                    type="email"
                    id="partner-email"
                    name="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    maxLength={254}
                    disabled={busy}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? "partner-email-error" : undefined}
                    onBlur={onBlur}
                    onChange={onChange}
                  />
                  {touched && emailError ? (
                    <p className="field-msg" id="partner-email-error">
                      {emailError}
                    </p>
                  ) : null}
                </div>
                <div className="hp" aria-hidden="true">
                  <label htmlFor="partner-company">Leave this empty</label>
                  <input
                    type="text"
                    id="partner-company"
                    name="_gotcha"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <input type="hidden" name="_subject" value="Hello from synthe.live" />
                <button className="btn2" type="submit" id="partner-submit" disabled={busy}>
                  {submitLabel}
                </button>
              </form>
              {busy ? (
                <div className="send-progress" role="status">
                  <Mark view="open" state="open" />
                  <p className="sp-label">
                    {send.kind === "sending"
                      ? "Sending your note to the Synthe team"
                      : "Opening your email app"}
                  </p>
                  <span className="sp-pip" aria-hidden="true" />
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p
        className={`trynote form-note${send.kind === "error" ? " is-error" : ""}`}
        id="partner-note"
        role={send.kind === "error" ? "alert" : "status"}
        aria-live={send.kind === "error" ? undefined : "polite"}
      >
        {send.kind === "error" ? (
          <>
            That didn't go through. Please write to{" "}
            <a className="textlink" href={`mailto:${FALLBACK_EMAIL}`}>
              {FALLBACK_EMAIL}
            </a>{" "}
            instead, or try again.
          </>
        ) : (
          note
        )}
      </p>
      <p className="trynote">
        This opens your email app with a note ready to send. Nothing is stored or sent on its own.
        Or email{" "}
        <a className="textlink" href="mailto:rohansiddam@synthe.live">
          rohansiddam@synthe.live
        </a>
        .
      </p>
    </>
  );
}
