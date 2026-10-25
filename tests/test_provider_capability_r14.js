/* R14 local-only capability + consent threat-model regression. */
'use strict';
const t=require('node:test'),assert=require('node:assert/strict');
const {evaluateProviderCapability:e,isOrigin,SCHEMA}=require('../src/core/provider_capability_r14.js');
const copy=o=>JSON.parse(JSON.stringify(o));
const B={
 provider:{id:'chrome_local',version:'0.1',mode:'on_device',languagePairs:[['en','zh-Hant'],['ja','zh-Hant']],
 availability:'available',requiresNetwork:false,requiresDownload:false,pricing:'UNKNOWN',retention:'LOCAL_ONLY',privacyUrl:'UNKNOWN'},
 request:{sourceLanguage:'en',targetLanguage:'zh-Hant',sequence:7,nonce:'long_random_n_2026',cancelled:false},
 site:{origin:'https://example.org'},consent:null,now:1792900000000
};
function run(mod){const obj=copy(B);mod?.(obj);return e(obj)}
function assertNoNetwork(x){assert.equal(x.networkRequested,false);assert.equal(x.contentTransmissionPermitted,false);assert.equal(x.rawTextIncluded,false);assert.equal(x.studyOnly,true)}
t('schema, offline-only declarations and immutable output',()=>{let x=run();assert.equal(x.schema,SCHEMA);assert.equal(x.decision,'ON_DEVICE_READY');assertNoNetwork(x);assert(Object.isFrozen(x));assert(Object.isFrozen(x.disclosures))});
t('strict BCP47 exact pairs do not conflate zh and zh-Hant',()=>{assert.equal(run(o=>o.request.targetLanguage='zh').decision,'UNSUPPORTED_PAIR');assert.equal(run(o=>o.request.targetLanguage='ZH-Hant').decision,'INVALID_INPUT');assert.equal(run(o=>o.request.sourceLanguage='ja').decision,'ON_DEVICE_READY');assert.equal(run(o=>o.request.sourceLanguage='fr').decision,'UNSUPPORTED_PAIR')});
t('offline rules allowed only when actually available',()=>{assert.equal(run(o=>{o.provider.mode='offline_rules'}).decision,'ALLOW_LOCAL_RULES');assert.equal(run(o=>{o.provider.mode='offline_rules';o.provider.availability='unknown'}).decision,'UNKNOWN_CAPABILITY');assert.equal(run(o=>{o.provider.mode='offline_rules';o.provider.requiresNetwork=true}).decision,'INVALID_INPUT')});
for(const [mode,decision] of [['downloadable','REQUIRES_USER_DOWNLOAD_ACTION'],['downloading','WAIT_MODEL_DOWNLOAD'],['unavailable','UNAVAILABLE_MODEL'],['unknown','UNKNOWN_CAPABILITY'],['available','ON_DEVICE_READY']])
 t('model state '+mode,()=>{let x=run(o=>{o.provider.availability=mode;o.provider.requiresDownload=mode==='downloadable'});assert.equal(x.decision,decision);assertNoNetwork(x)});
t('model download explicitly visible and never treated as text egress',()=>{let x=run(o=>{o.provider.availability='downloadable';o.provider.requiresDownload=true;o.provider.requiresNetwork=true});assert.equal(x.decision,'REQUIRES_USER_DOWNLOAD_ACTION');assert.equal(x.requiresDownload,true);assert.equal(x.disclosures.downloadMayUseNetwork,true);assert.equal(x.disclosures.dataRoute,'LOCAL_NO_TEXT_EGRESS')});
t('on-device available with unconditional network requirement rejected',()=>{assert.equal(run(o=>o.provider.requiresNetwork=true).decision,'INVALID_INPUT')});
t('all remote paths fail closed without any network transport',()=>{
 const remote=o=>{o.provider.mode='remote_opt_in';o.provider.requiresNetwork=true};
 let x=run(remote);assert.equal(x.decision,'CONSENT_REQUIRED');assertNoNetwork(x);
 for(const state of ['revoked','denied','expired']){x=run(o=>{remote(o);o.consent={origin:'https://example.org',providerId:'chrome_local',status:state,expiresAt:1793000000000,sequence:7,nonce:'long_random_n_2026'}});assert.equal(x.decision,'CONSENT_REVOKED');assertNoNetwork(x)}
 x=run(o=>{remote(o);o.consent={origin:'https://example.org',providerId:'chrome_local',status:'explicit_granted',expiresAt:1793000000000,sequence:7,nonce:'long_random_n_2026'}});assert.equal(x.decision,'REMOTE_DISABLED_IN_MVP');assertNoNetwork(x);
});
for(const [field,value] of [['origin','https://evil.org'],['providerId','other'],['nonce','other_long_nonce_2026'],['sequence',8]]){
 t('remote stale '+field,()=>{let x=run(o=>{o.provider.mode='remote_opt_in';o.provider.requiresNetwork=true;o.consent={origin:'https://example.org',providerId:'chrome_local',status:'explicit_granted',expiresAt:1793000000000,sequence:7,nonce:'long_random_n_2026'};o.consent[field]=value});assert.equal(x.decision,'STALE_REQUEST');assertNoNetwork(x)})
}
t('expired remote consent',()=>{let x=run(o=>{o.provider.mode='remote_opt_in';o.provider.requiresNetwork=true;o.consent={origin:'https://example.org',providerId:'chrome_local',status:'explicit_granted',expiresAt:1792900000000,sequence:7,nonce:'long_random_n_2026'}});assert.equal(x.decision,'CONSENT_REVOKED')});
t('local stale consent cannot be reused across origin or request sequence',()=>{let x=run(o=>{o.consent={origin:'https://other.org',providerId:'chrome_local',status:'explicit_granted',expiresAt:1793000000000,sequence:7,nonce:'long_random_n_2026'}});assert.equal(x.decision,'STALE_REQUEST')});
t('cancelled request must not obtain local or remote ready status',()=>{assert.equal(run(o=>o.request.cancelled=true).decision,'CANCELLED');assert.equal(run(o=>{o.request.cancelled=true;o.provider.mode='remote_opt_in';o.provider.requiresNetwork=true}).decision,'CANCELLED')});
for(const origin of ['https://EXAMPLE.org','https://example.org/','https://example.org:443','https://example.org/path','file:///tmp/a','https://evil.org@example.org','https://example.org.evil.com:443/foo','about:blank','https://example.org?x=1','https://example.org#x','https://example.org.','https://example.org%2e']){
 t('unsafe/noncanonical origin '+origin,()=>{assert.equal(isOrigin(origin),false);assert.equal(run(o=>o.site.origin=origin).decision,'INVALID_INPUT')})
}
t('canonical http and https origins accepted',()=>{assert.equal(isOrigin('https://example.org'),true);assert.equal(isOrigin('http://example.org'),true)});
t('prototype pollution fields rejected fail-closed',()=>{let o=copy(B);o.provider=JSON.parse(JSON.stringify(o.provider).replace('{','{"__proto__":{"polluted":true},'));assert.equal(e(o).decision,'INVALID_INPUT');assert.equal({}.polluted,undefined)});
t('invalid prototype/array/extra fields/null input fail-closed',()=>{assert.equal(e(null).decision,'INVALID_INPUT');assert.equal(e([]).decision,'INVALID_INPUT');assert.equal(e(Object.assign(Object.create(null),{provider:B.provider})).decision,'INVALID_INPUT');assert.equal(run(o=>o.provider.extra='unsafe').decision,'INVALID_INPUT');assert.equal(run(o=>o.request.extra='unsafe').decision,'INVALID_INPUT');assert.equal(run(o=>o.consent=[]).decision,'INVALID_INPUT')});
t('provider duplicate pairs, invalid ids, unknown modes and huge metadata fail closed',()=>{assert.equal(run(o=>o.provider.languagePairs.push(['en','zh-Hant'])).decision,'INVALID_INPUT');assert.equal(run(o=>o.provider.mode='https').decision,'INVALID_INPUT');assert.equal(run(o=>o.provider.id='bad provider').decision,'INVALID_INPUT');assert.equal(run(o=>o.provider.pricing='x'.repeat(130)).decision,'INVALID_INPUT')});
t('unsafe URLs or scheme rejected as privacy source',()=>{assert.equal(run(o=>o.provider.privacyUrl='javascript:alert(1)').decision,'INVALID_INPUT');assert.equal(run(o=>o.provider.privacyUrl='http://unsafe.test').decision,'INVALID_INPUT')});
t('input origin and content never retained in result',()=>{let input=copy(B);input.site.origin='https://demo.test';input.consent=null;let o=e(input);assert.equal(o.scopeOrigin,'https://demo.test');assert(!JSON.stringify(o).includes('long_random_n_2026'));assert(!JSON.stringify(o).includes('sourceLanguage'))});
