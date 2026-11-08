/**
 * 音频服务与发音适配器 (Sound Service)
 * 1. 优先采用真人外教录音原声流 (纯正英音/美音外教母语发音，彻底解决 iPad 上合成音机械、发瘪、含糊不清的问题)
 * 2. 句子填空与离线场景自动降级至高质量系统神经网络 TTS
 */

export class SoundService {
  private static audioCtx: AudioContext | null = null;
  private static isAudioUnlocked = false;
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static currentVoiceName: string = '';
  private static accent: 'uk' | 'us' = 'uk'; // 默认纯正英音 (Cambridge)
  private static currentAudio: HTMLAudioElement | null = null;

  /**
   * 解锁 iPad / iOS Safari 上的 Web Audio 和 SpeechSynthesis 限制
   */
  public static unlockAudioContext(): void {
    if (this.isAudioUnlocked) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // 静音激活 SpeechSynthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
        this.getVoicesAsync();
      }

      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  public static setAccent(accent: 'uk' | 'us'): void {
    this.accent = accent;
  }

  public static getAccent(): 'uk' | 'us' {
    return this.accent;
  }

  /**
   * 异步可靠获取浏览器可用语音列表（用于例句与离线保底）
   */
  public static async getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    if (this.cachedVoices.length > 0) {
      return this.cachedVoices;
    }

    const current = window.speechSynthesis.getVoices();
    if (current.length > 0) {
      this.cachedVoices = current;
      return current;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.cachedVoices = window.speechSynthesis.getVoices();
        resolve(this.cachedVoices);
      };

      window.speechSynthesis.onvoiceschanged = finish;
      setTimeout(finish, 350);
    });
  }

  /**
   * 智能挑选最高音质的合成音（备用保底）
   */
  public static async selectBestVoice(): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.getVoicesAsync();
    if (voices.length === 0) return null;

    // 1. 优先定位微软神经网络 Ryan 音色
    const ryanVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes('ryan') ||
        v.voiceURI.toLowerCase().includes('ryan')
    );
    if (ryanVoice) {
      this.currentVoiceName = ryanVoice.name;
      return ryanVoice;
    }

    // 2. 微软 Edge / 现代浏览器 Online Natural 神经网络英音
    const edgeNaturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Online (Natural)') || v.name.includes('Natural'))
    );
    if (edgeNaturalVoice) {
      this.currentVoiceName = edgeNaturalVoice.name;
      return edgeNaturalVoice;
    }

    // 3. 苹果 iOS / iPad 原生高级自然音
    const appleNaturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Oliver') ||
          v.name.includes('Daniel') ||
          v.name.includes('Arthur') ||
          v.name.includes('Samantha') ||
          v.name.includes('Serena'))
    );
    if (appleNaturalVoice) {
      this.currentVoiceName = appleNaturalVoice.name;
      return appleNaturalVoice;
    }

    // 4. 谷歌自然英音
    const googleVoice = voices.find(
      (v) => v.name.includes('Google UK English') || v.name.includes('Google US English')
    );
    if (googleVoice) {
      this.currentVoiceName = googleVoice.name;
      return googleVoice;
    }

    // 5. 本地 SAPI 兜底 (Zira 女声平滑)
    const ziraVoice = voices.find((v) => v.name.includes('Zira'));
    if (ziraVoice) {
      this.currentVoiceName = ziraVoice.name;
      return ziraVoice;
    }

    const anyEn = voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
    if (anyEn) {
      this.currentVoiceName = anyEn.name;
    }
    return anyEn;
  }

  public static getCurrentVoiceName(): string {
    return this.currentVoiceName || '母语外教高清原声 (剑桥/牛津标准音)';
  }

  /**
   * 播放真人录音棚原声流
   */
  private static playNativeAudio(word: string, rate: number = 1.0): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        const typeParam = this.accent === 'uk' ? '1' : '2';
        const cleanWord = encodeURIComponent(word.trim());
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${cleanWord}&type=${typeParam}`;

        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.playbackRate = Math.max(0.7, Math.min(1.3, rate));

        const timeout = setTimeout(() => {
          resolve(false);
        }, 3000);

        audio.onended = () => {
          clearTimeout(timeout);
          resolve(true);
        };

        audio.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            clearTimeout(timeout);
            resolve(false);
          });
        }
      } catch (err) {
        resolve(false);
      }
    });
  }

  /**
   * 朗读英文单词、短语或句子
   * 单词/短语优先调用母语外教真人录音原声，例句/复杂句或网络异常时自动使用高品质 TTS
   */
  public static async speak(text: string, rate: number = 0.9): Promise<void> {
    if (typeof window === 'undefined') return;

    this.unlockAudioContext();

    const cleanText = text.trim();
    if (!cleanText) return;

    // 判定是否为单词或短语 (通常不包含标点句号、不含超过 4 个单词)
    const isSingleWordOrShortPhrase =
      !cleanText.includes('.') &&
      !cleanText.includes('?') &&
      !cleanText.includes('!') &&
      cleanText.split(/\s+/).length <= 4 &&
      !cleanText.includes('blank');

    if (isSingleWordOrShortPhrase) {
      const nativeOk = await this.playNativeAudio(cleanText, rate);
      if (nativeOk) return; // 成功播放真人原声，直接返回！
    }

    // 降级使用 TTS 合成音（处理句子理解题、挖空例句或无网场景）
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const voice = await this.selectBestVoice();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.accent === 'uk' ? 'en-GB' : 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1.0;

      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis speak failed:', e);
    }
  }

  /**
   * 停止当前发音
   */
  public static stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 极简高雅反馈音效 (零音频文件依赖，纯 Web Audio 合成)
   */
  public static playSFX(type: 'correct' | 'wrong' | 'complete' | 'easter_egg'): void {
    try {
      this.unlockAudioContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      if (type === 'correct') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'wrong') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'complete' || type === 'easter_egg') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const t = now + i * 0.09;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.26);
        });
      }
    } catch (e) {
      // AudioCtx muted / not ready
    }
  }
}
