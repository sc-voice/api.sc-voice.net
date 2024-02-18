import { SuttaRef }  from "scv-esm/main.mjs";
import Voice from "./voice.cjs";
import { logger } from "log-instance";
import {
  DBG_SC_LINKS
} from './defines.cjs'

export default class Links {
  constructor() {
  }

  voiceLink(suttaRef) {
    let { sutta_uid, lang, author, segnum } = suttaRef;
    if (lang === 'pli') {
      lang = 'en';
    }
    return [
      `https://voice.suttacentral.net/scv/#`,
      `?search=${sutta_uid}&lang=${lang||'en'}`,
    ].join('/');
  }

  ebtSuttaRefLink(sref,src="sc") {
    const msg = "Links.ebtSuttaRefLink() ";
    const dbg = DBG_SC_LINKS;
    let { lang='en' }= sref;
    let suttaRef = SuttaRef.createOpts(sref, {
      normalize: true,
      defaultLang: lang,
    });
    lang = suttaRef && suttaRef.lang || lang;
    if (Voice.supportedLanguages[lang]) {
      dbg && console.log(msg, '[1]supportedLanguage', {sref});
    } else {
      dbg && console.log(msg, '[2]!supportedLanguage', {sref});
      lang = 'en';
      suttaRef.lang = lang;
    }
    let pathSutta = suttaRef == null
      ? `?src=${src}`
      : `?src=${src}#/sutta/${suttaRef.toString()}`;

    switch (lang) {
      case 'de':
        return `https://dhammaregen.net/${pathSutta}`;
      case 'pli':
      case 'en':
      default: 
        return `https://sc-voice.net/${pathSutta}`;
    }
  }
}
