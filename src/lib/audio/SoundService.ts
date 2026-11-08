/**
 * 音频服务与发音适配器 (Sound Service)
 * 异步预加载语音列表，深度锁定微软神经网络 Ryan 音色与高质量自然英音，彻底替换 Windows 默认机械音
 */

export class SoundService {
  private static audioCtx: AudioContext | null = null;
  private static isAudioUnlocked = false;
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static currentVoiceName: string = '';

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
        // 预拉取语音
        this.getVoicesAsync();
      }

      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  /**
   * 异步可靠获取浏览器可用语音列表（解决异步加载延迟返回空数组的问题）
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

      // 监听浏览器异步加载事件
      window.speechSynthesis.onvoiceschanged = finish;

      // 300ms 安全后备超时
      setTimeout(finish, 350);
    });
  }

  /**
   * 智能挑选最高音质的声音（优先 Ryan，其次神经网络/自然男声，严禁落入冷硬机械音）
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

    // 2. 微软 Edge / 现代浏览器 Online Natural 神经网络英音 (Sonia, Guy, Jenny, Libby 等)
    const edgeNaturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Online (Natural)') || v.name.includes('Natural'))
    );
    if (edgeNaturalVoice) {
      this.currentVoiceName = edgeNaturalVoice.name;
      return edgeNaturalVoice;
    }

    // 3. 苹果 iOS / iPad 原生高级自然音 (Oliver, Daniel, Arthur, Samantha)
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

    // 5. Windows 本地 SAPI 兜底：优先使用 Zira（女声平滑，远优于极其机械生硬的 David）
    const ziraVoice = voices.find((v) => v.name.includes('Zira'));
    if (ziraVoice) {
      this.currentVoiceName = ziraVoice.name;
      return ziraVoice;
    }

    // 6. 最终英文保底
    const anyEn = voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
    if (anyEn) {
      this.currentVoiceName = anyEn.name;
    }
    return anyEn;
  }

  /**
   * 获取当前生效的音色名称
   */
  public static getCurrentVoiceName(): string {
    return this.currentVoiceName || '正在匹配神经网络音色...';
  }

  /**
   * 朗读英文单词、短语或句子（保证使用异步挑选的高品质音色）
   */
  public static async speak(text: string, rate: number = 0.9): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const voice = await this.selectBestVoice();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = rate; // 0.9 自然语速
      utterance.pitch = 1.0;

      if (voice) {
        utterance.voice = voice;
        // console.log('[WordQuest TTS Active Voice]:', voice.name);
      }

      return new Promise((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  }

  /**
   * Web Audio API 合成音效
   */
  public static playSFX(type: 'correct' | 'wrong' | 'complete' | 'easter_egg'): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'correct') {
        this.createTone(ctx, 523.25, now, 0.12, 'sine', 0.15);
        this.createTone(ctx, 783.99, now + 0.1, 0.22, 'sine', 0.15);
      } else if (type === 'wrong') {
        this.createTone(ctx, 329.63, now, 0.15, 'triangle', 0.12);
        this.createTone(ctx, 261.63, now + 0.12, 0.25, 'triangle', 0.12);
      } else if (type === 'complete' || type === 'easter_egg') {
        this.createTone(ctx, 523.25, now, 0.15, 'sine', 0.15);
        this.createTone(ctx, 659.25, now + 0.12, 0.15, 'sine', 0.15);
        this.createTone(ctx, 783.99, now + 0.24, 0.2, 'sine', 0.15);
        this.createTone(ctx, 1046.50, now + 0.38, 0.45, 'sine', 0.18);
      }
    } catch (e) {}
  }

  private static createTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    maxGain: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
