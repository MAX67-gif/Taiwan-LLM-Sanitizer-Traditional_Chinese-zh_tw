/* Taiwan-LLM-Sanitizer — original MIT open-core R3 preference contract.
 * Stewardship: CA L.  No censorship or hidden network calls. */
(function(global) {
  'use strict';
  const VERSION='0.3.0';
  const LEVELS=Object.freeze(['original','light','balanced','taiwan']);
  const TONES=Object.freeze(['faithful','natural','formal','casual']);
  const DOMAINS=Object.freeze(['auto','general','ui','software','engineering','ai','security',
    'ecommerce','finance','food','travel','education','medicine','media','office',
    'public','games','industry']);
  const DEFAULTS=Object.freeze({regionalPreference:'balanced',tone:'faithful',domain:'auto'});
  const DESCRIPTIONS=Object.freeze({
    original:'保留原用語',light:'輕度臺灣化',balanced:'自然平衡',taiwan:'臺灣用語優先'
  });
  const TONE_LABELS=Object.freeze({
    faithful:'忠於原文',natural:'自然順口',formal:'正式專業',casual:'輕鬆口語'
  });
  function normalize(input={}) {
    const a=(input && typeof input==='object')?input:{};
    return {
      regionalPreference:LEVELS.includes(a.regionalPreference)?a.regionalPreference:DEFAULTS.regionalPreference,
      tone:TONES.includes(a.tone)?a.tone:DEFAULTS.tone,
      domain:DOMAINS.includes(a.domain)?a.domain:DEFAULTS.domain
    };
  }
  function levelFor(options={}) {
    return normalize(options).regionalPreference;
  }
  function explainPolicy(options={}) {
    const s=normalize(options);
    return Object.freeze({
      ...s,
      regionalDescription:DESCRIPTIONS[s.regionalPreference],
      toneDescription:TONE_LABELS[s.tone],
      // Chrome Translator API does not expose natural/formal/casual style controls.
      toneAppliedByChromeTranslator:false,
      candidateCorpusAutoApplied:false,
      preservesUserChoice:true
    });
  }
  const api=Object.freeze({
    VERSION,LEVELS,TONES,DOMAINS,DEFAULTS,DESCRIPTIONS,TONE_LABELS,
    normalize,levelFor,explainPolicy
  });
  global.TLSPreferences=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
