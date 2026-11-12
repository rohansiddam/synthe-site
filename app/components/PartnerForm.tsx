"use client";

import { useRef, useState } from "react";

/* The partner form, ported from the homepage's inline script and HOSTING.md.
   It opens the visitor's email app by default (the form's action is a
   mailto: link, so it also works without JavaScript). Once a Formspree form
   ID is set in FORMSPREE_ID below, it posts there instead; then the privacy
   lines next to the form and on the Limits page must say submissions go to
   Formspree (the static site's check_site.py enforces that agreement). */
const FORMSPREE_ID = "";
const FALLBACK_EMAIL = "rohansiddam@synthe.live";

export function PartnerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [note, setNote] = useState<React.ReactNode>("");
  const [submitLabel, setSubmitLabel] = useState("Talk to us");
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const emailEl = form.elements.namedItem("email") as HTMLInputElement;
    const gotcha = form.elements.namedItem("_gotcha") as HTMLInputElement;
    const email = emailEl.value.trim();
    if (!email || !emailEl.checkValidity()) {
      setNote("Please enter a valid email address.");
      emailEl.focus();
      return;
    }
    if (gotcha.value) return;

    const configured = /^[A-Za-z0-9]+$/.test(FORMSPREE_ID);
    if (!configured || !window.fetch) {
      const body =
        "Hi,\n\nWe use AI agents in production and would like to talk.\n\nMy email: " + email + "\n";
      window.location.href =
        "mailto:" +
        FALLBACK_EMAIL +
        "?subject=" +
        encodeURIComponent("Hello from synthe.live") +
        "&body=" +
        encodeURIComponent(body);
      setNote("Opening your email app with the note ready to send.");
      return;
    }

    setSending(true);
    setSubmitLabel("Sending…");
    setNote("");
    fetch("https://formspree.io/f/" + FORMSPREE_ID, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error("status " + r.status);
        form.reset();
        setSubmitLabel("Sent");
        setNote("Thanks. We'll be in touch at " + email + ".");
      })
      .catch(() => {
        setSending(false);
        setSubmitLabel("Talk to us");
        setNote(
          <>
            That didn't go through. Please write to{" "}
            <a className="textlink" href={`mailto:${FALLBACK_EMAIL}`}>
              {FALLBACK_EMAIL}
            </a>{" "}
            instead.
          </>,
        );
      });
  };

  return (
    <>
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
          />
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="partner-company">Leave this empty</label>
          <input type="text" id="partner-company" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="_subject" value="Hello from synthe.live" />
        <button className="btn2" type="submit" id="partner-submit" disabled={sending}>
          {submitLabel}
        </button>
      </form>
      <p className="trynote form-note" id="partner-note" role="status" aria-live="polite">
        {note}
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
