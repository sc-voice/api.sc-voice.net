typeof describe === "function" &&
  describe("human-tts", function () {
    const should = require("should");
    const fs = require("fs");
    const path = require("path");
    const tmp = require("tmp");
    const { logger } = require("log-instance");
    const HumanTts = require('../src/human-tts.cjs');
    const SCAudio = require('../src/sc-audio.cjs');
    const SoundStore = require('../src/sound-store.cjs');

    const BREAK = '<break time="0.001s"/>';
    const SRC = path.join(__dirname, "..", "src");

    function phoneme(ph, text) {
      return (
        `<phoneme alphabet="ipa" ph="${ph}">${text}</phoneme>` + `${BREAK}`
      );
    }

    const TEST_SCAUDIO = new SCAudio();

    it("constructor", function () {
      // Default
      var humanTts = new HumanTts();
      should(humanTts).properties({
        language: "pli",
        localeIPA: "pli",
        voice: "sujato_pli",
        audioFormat: "mp3",
        audioSuffix: ".mp3",
        prosody: {
          rate: "0%", // can't change humans
        },
      });

      // Custom
      var humanTts = new HumanTts({
        language: "pli",
        scAudio: TEST_SCAUDIO,
      });
      should(humanTts).properties({
        language: "pli",
        localeIPA: "pli",
        voice: "sujato_pli",
        audioFormat: "mp3",
        audioSuffix: ".mp3",
        scAudio: TEST_SCAUDIO,
        prosody: {
          rate: "0%", // can't change humans
        },
      });
    });
    it("signature(text) returns TTS synthesis signature", function () {
      var humanTts = new HumanTts();
      should(humanTts.language).equal("pli");
      var sig = humanTts.signature("hello world");
      var guid = humanTts.mj.hash(sig);
      should.deepEqual(sig, {
        api: "human-tts",
        apiVersion: "v1",
        audioFormat: "mp3",
        voice: "sujato_pli",
        language: "pli",
        prosody: {
          rate: "0%",
        },
        text: "hello world",
        guid,
      });
    });
    it("segmentSSML(text) returns SSML", function () {
      var humanTts = new HumanTts({
        language: "pli",
        localeIPA: "pli",
        stripQuotes: true,
      });
      should.deepEqual(humanTts.segmentSSML("281"), ["281"]),
        should(humanTts.isNumber("281–309")).equal(true);
      should.deepEqual(humanTts.segmentSSML("281–​309"), ["281–309"]);
      should.deepEqual(humanTts.segmentSSML("ye"), ["ye"]);
      should.deepEqual(humanTts.segmentSSML("“Bhadante”ti"), ["Bhadante ti"]);
      should.deepEqual(humanTts.segmentSSML("mūlaṃ"), ["mūlaṃ"]);
    });
    it("synthesizeSSML(ssml) returns noAudio sound file", async()=>{
      this.timeout(3 * 1000);
      var noAudioPath = path.join(SRC, "data", "no_audio.mp3");
      var humanTts = new HumanTts();
      humanTts.logLevel = "error";
      var segments = [
        `<phoneme alphabet="ipa" ph="səˈpriːm"></phoneme>`,
        `full enlightenment, I say.`,
      ];
      var ssml = segments.join(" ");
      var result = await humanTts.synthesizeSSML(ssml);
      should(result).properties(["file", "signature", "hits", "misses"]);
      should(result.file).equal(noAudioPath);
    });
    it("synthesizeSegment(ssml) returns SN2.3:1.1 sound file", async()=>{
      this.timeout(5 * 1000);
      var humanTts = new HumanTts();
      var segment = {
        en: "no-english",
        pli: "no-pali",
        scid: "sn2.3:1.1",
      };
      var guid = "b90220f1e99fb739068bc6fe4ddec005";
      var storePath = tmp.tmpNameSync();
      var downloadDir = tmp.tmpNameSync();
      var scAudio = new SCAudio({
        downloadDir,
      });
      var altTts = undefined;
      var language = "en";
      var soundStore = new SoundStore({
        storePath,
      });
      var translator = "sujato";
      var usage = "recite";
      var volume = undefined;
      var downloadAudio = true;
      var opts = Object.assign(
        {},
        {
          segment,
          scAudio,
          altTts,
          language,
          soundStore,
          translator,
          usage,
          volume,
          downloadAudio,
        }
      );
      var result = await humanTts.synthesizeSegment(opts);
      should(result.signature.guid).equal(guid);
      should(result.signature.scAudioVersion).equal("3");
      var guidDir = guid.substring(0, 2);
      var reFile = new RegExp(
        `.*/${guidDir}/${guid}${soundStore.audioSuffix}$`
      );
      should(result.file).match(reFile);
      should(fs.existsSync(result.file)).equal(true);
      var stats = fs.statSync(result.file);
      //should(stats.size).above(56000).below(57000);
      should(stats.size).above(28000).below(29000);
    });
  });
