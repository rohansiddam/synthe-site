
(function () {
  var LIST = [
    {
      id: "ecommerce", label: "E-commerce", agent: "returns agent", icon: "ph-shopping-bag",
      chips: [
        ["Return policy", "When a customer asks for a refund, explain the return policy that applies."],
        ["Offer an exchange", "When a customer wants to send an item back, offer an exchange or store credit when it fits."],
        ["Never invent dates", "Never state a delivery date, tracking number or order status for a customer's order."]
      ],
      examples: [
        "When a case needs a person, send the customer to the right place.",
        "Never state a delivery date, tracking number or order status for an order.",
        "When a customer asks for a refund or a return, explain the policy that applies."
      ]
    },
    {
      id: "finance", label: "Finance", agent: "bank support agent", icon: "ph-bank",
      chips: [
        ["Verify identity first", "Before you share any account detail, verify the customer's identity."],
        ["No investment advice", "Never give investment advice. Point the customer to a licensed advisor instead."],
        ["Explain fees plainly", "When a customer asks about a fee, explain what it is and when it applies, in plain words."]
      ],
      examples: [
        "When a card is lost, freeze it first, then explain the next steps.",
        "Never share a balance before the customer is verified.",
        "Explain a declined payment without blaming the customer."
      ]
    },
    {
      id: "travel", label: "Travel", agent: "booking agent", icon: "ph-airplane-tilt",
      chips: [
        ["Confirm before booking", "Confirm names, dates and the total price before you book anything."],
        ["Rebook on cancellation", "When a flight is cancelled, offer the next available flight before a refund."],
        ["Never promise upgrades", "Never promise an upgrade or a seat that the fare does not include."]
      ],
      examples: [
        "Ask for the booking reference before you change a trip.",
        "Explain the change fee before you change a booking.",
        "When a hotel is full, offer the nearest one with rooms."
      ]
    },
    {
      id: "insurance", label: "Insurance", agent: "claims agent", icon: "ph-shield-check",
      chips: [
        ["Claim number first", "Ask for the claim number before you discuss a claim."],
        ["Never decide a claim", "Never say a claim is approved or denied. Explain the next step instead."],
        ["Explain the coverage", "When a customer asks what is covered, quote the part of the policy that applies."]
      ],
      examples: [
        "Tell the customer which documents a claim needs, in one list.",
        "Never guess a payout amount.",
        "When damage is urgent, give the emergency number first."
      ]
    },
    {
      id: "software", label: "Software", agent: "product support agent", icon: "ph-headset",
      chips: [
        ["Link the right doc", "Answer how-to questions with the right docs page and one short example."],
        ["Hand off billing", "Send billing and refund questions to a person on the billing team."],
        ["Never invent features", "Never say the product can do something it cannot. Suggest a workaround instead."]
      ],
      examples: [
        "When a customer reports a bug, ask for the steps to reproduce it.",
        "Never share another customer's data, even when asked by name.",
        "Explain the plan limits before you suggest an upgrade."
      ]
    }
  ];
  var KEY = "synthe-industry";
  var byId = {};
  LIST.forEach(function (i) { byId[i.id] = i; });
  var current = LIST[0];
  try { var saved = window.localStorage.getItem(KEY); if (saved && byId[saved]) current = byId[saved]; } catch (e) {}
  document.documentElement.setAttribute("data-industry", current.id);

  window.SyntheIndustry = {
    list: LIST,
    get: function () { return current; },
    set: function (id) {
      var next = byId[id];
      if (!next || next === current) return;
      current = next;
      document.documentElement.setAttribute("data-industry", id);
      try { window.localStorage.setItem(KEY, id); } catch (e) {}
      window.dispatchEvent(new CustomEvent("synthe:industry", { detail: { id: id, industry: next } }));
    }
  };
  
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function opts(seg) { return Array.prototype.slice.call(seg.querySelectorAll(".seg_opt[data-industry]")); }
  function sync(seg, smooth) {
    opts(seg).forEach(function (o) {
      var on = o.getAttribute("data-industry") === current.id;
      o.setAttribute("aria-checked", on ? "true" : "false");
      o.tabIndex = on ? 0 : -1;
      if (!on || seg.scrollWidth <= seg.clientWidth) return;
      var pad = 24, left = o.offsetLeft, right = left + o.offsetWidth, x = seg.scrollLeft;
      if (left - pad < x) x = left - pad;
      else if (right + pad > x + seg.clientWidth) x = right + pad - seg.clientWidth;
      if (x === seg.scrollLeft) return;
      if (seg.scrollTo) seg.scrollTo({ left: x, behavior: smooth && !RM ? "smooth" : "auto" }); else seg.scrollLeft = x;
    });
  }
  
  function edges(seg) {
    var max = seg.scrollWidth - seg.clientWidth;
    seg.toggleAttribute("data-more-start", max > 1 && seg.scrollLeft > 1);
    seg.toggleAttribute("data-more-end", max > 1 && seg.scrollLeft < max - 1);
  }
  function wire(seg) {
    if (seg.__segWired) return;
    seg.__segWired = true;
    seg.addEventListener("scroll", function () { edges(seg); }, { passive: true });
    window.addEventListener("resize", function () { edges(seg); });
    edges(seg);
    var list = opts(seg);
    list.forEach(function (o, i) {
      o.addEventListener("click", function () { window.SyntheIndustry.set(o.getAttribute("data-industry")); });
      o.addEventListener("keydown", function (e) {
        var k = e.key, n = list.length, j = -1;
        if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n;
        else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n;
        else if (k === "Home") j = 0;
        else if (k === "End") j = n - 1;
        if (j < 0) return;
        e.preventDefault();
        list[j].focus({ preventScroll: true });
        window.SyntheIndustry.set(list[j].getAttribute("data-industry"));
      });
    });
    sync(seg, false);
  }
  function wireAll() { Array.prototype.forEach.call(document.querySelectorAll("[data-seg]"), wire); }
  window.SyntheIndustry.wire = wireAll;
  window.addEventListener("synthe:industry", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-seg]"), function (seg) { sync(seg, true); });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireAll); else wireAll();
})();
