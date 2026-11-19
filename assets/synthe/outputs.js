
(function () {
  'use strict';
  var frame = document.querySelector('[data-op-frame]');
  if (!frame) return;

  
  var PR = {
    ecommerce: ['Explain the return window first', 'Always offer a refund when a customer asks.', 'Explain the return window before offering a refund.'],
    finance: ['Verify identity first', 'Answer balance questions as soon as the customer asks.', "Verify the customer's identity before you share any account detail."],
    travel: ['Rebook before refunding', 'Offer a refund when a flight is cancelled.', 'When a flight is cancelled, offer the next available flight before a refund.'],
    insurance: ['Explain the next step, not a decision', 'Tell the customer whether their claim will be approved.', 'Never say a claim is approved or denied. Explain the next step instead.'],
    software: ['Answer with the right docs page', 'Answer how-to questions from memory.', 'Answer how-to questions with the right docs page and one short example.']
  };
  var slots = {};
  ['title', 'path', 'del', 'add'].forEach(function (k) { slots[k] = frame.querySelector('[data-op="' + k + '"]'); });
  var shown = 'ecommerce';
  function apply(ind, animate) {
    if (!ind || !PR[ind.id] || ind.id === shown) return;
    shown = ind.id;
    var c = PR[ind.id];
    var v = { title: c[0], del: c[1], add: c[2], path: 'prompts/' + String(ind.agent || '').replace(/ agent$/, '').replace(/\s+/g, '-') + '.md' };
    Object.keys(slots).forEach(function (k) {
      var el = slots[k]; if (!el) return;
      el.textContent = v[k];
      var M = window.SyntheStory && window.SyntheStory.M;
      if (animate && M && M.play) M.play(el, [{ opacity: 0.35 }, { opacity: 1 }], { dur: 208, curve: 'fade' });
    });
  }
  function initInd() { if (window.SyntheIndustry) apply(window.SyntheIndustry.get(), false); }
  addEventListener('synthe:industry', function (e) { apply(e.detail && e.detail.industry, true); });
  if (window.SyntheIndustry) initInd(); else addEventListener('DOMContentLoaded', initInd, { once: true });


  
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var story = window.SyntheStory, M = story && story.M;
  if (!M || !M.play) return;

  var surfaces = [].slice.call(frame.querySelectorAll('.op-surface'));
  var gains = [].slice.call(frame.querySelectorAll('.op-new'));
  var verdict = frame.querySelector('[data-op-verdict]');
  var T = M.T || { settle: 520, draw: 760, commit: 640 };
  function stagger(i) { var g = 60, t = 0; for (var k = 0; k < i; k++) { t += g; g *= 0.75; } return Math.round(t); }

  
  if (frame.getBoundingClientRect().top < window.innerHeight) return;
  frame.classList.add('op-armed');

  function play() {
    surfaces.forEach(function (el, i) {
      var d = stagger(i);
      M.play(el, [{ transform: 'translateY(16px)' }, { transform: 'translateY(0px)' }], { dur: T.settle, delay: d, curve: 'settle', spec: { prop: 'translateY', from: 16, to: 0 }, label: 'outputs · surface ' + (i + 1) });
      M.play(el, [{ opacity: 0 }, { opacity: 1 }], { dur: Math.round(T.settle * 0.4), delay: d, curve: 'fade' });
    });
    var start = 260;
    gains.forEach(function (el, i) {
      M.play(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { dur: T.draw, delay: start + stagger(i), curve: 'draw', spec: { prop: 'scaleX', from: 0, to: 1 }, label: 'outputs · gain ' + (i + 1) });
    });
    if (verdict) {
      var vd = start + stagger(gains.length) + T.draw - 120;
      M.play(verdict, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }], { dur: T.commit, delay: vd, curve: 'commit', label: 'outputs · merged' });
    }
    frame.classList.remove('op-armed');
  }

  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    play();
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });
  io.observe(frame);
})();
