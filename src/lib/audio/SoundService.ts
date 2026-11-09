/**
 * 音频服务与发音适配器 (Sound Service)
 * 1. 优先采用真人外教录音原声流 (纯正英音/美音外教母语发音，彻底解决 iPad 上合成音机械、发瘪、含糊不清的问题)
 * 2. 管道式离线音频预加载与 IndexedDB 强缓存（0 延迟秒开，弱网/离线依然流畅）
 * 3. 严格单声音源与精准销毁时序控制，彻底根除“不同音色重读两遍”的并发与超时残留问题
 * 4. 仅长例句与语法句启用系统高品质自然 TTS 朗读
 */

import { preloadWordAudio, resolveAudioUrl } from './clientAudioCache';

export class SoundService {
  private static audioCtx: AudioContext | null = null;
  private static isAudioUnlocked = false;
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static currentVoiceName: string = '';
  private static accent: 'uk' | 'us' = 'uk'; // 默认纯正英音 (Cambridge)
  private static currentAudio: HTMLAudioElement | null = null;
  private static activePlaybackSeq: number = 0;

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
   * 批量预加载单词音频（管道式预加载，弱网/离线秒开）
   */
  public static preloadWordAudio(
    items: Array<{ word: string } | string | null | undefined>
  ): void {
    preloadWordAudio(items, this.accent);
  }

  /**
   * 异步可靠获取浏览器可用语音列表（用于长例句）
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
   * 智能挑选最高音质的合成音（备用保底例句）
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
   * 播放真人录音棚原声流 (带缓存秒开与精准超时销毁，严防后台晚到重播)
   */
  private static playNativeAudio(word: string, rate: number = 1.0, seq: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      let audio: HTMLAudioElement | null = null;
      let timeoutTimer: NodeJS.Timeout | null = null;
      let isDone = false;

      const cleanup = () => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
      };

      const destroyAudio = () => {
        cleanup();
        if (audio) {
          try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
          } catch (e) {}
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          audio = null;
        }
      };

      try {
        // 尝试从内存/IndexedDB/强缓存解析音频 URL（若已预载，耗时 < 5ms）
        const audioUrl = await resolveAudioUrl(word, this.accent);

        // 如果在解析期间已被更新的时序覆盖，直接终止
        if (this.activePlaybackSeq !== seq) {
          resolve(true);
          return;
        }

        audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.playbackRate = Math.max(0.7, Math.min(1.3, rate));

        // 弱网保护超时 (4秒)：若网络严重受阻，到期强制彻底销毁音频实例，切断后台播放
        timeoutTimer = setTimeout(() => {
          if (isDone) return;
          isDone = true;
          destroyAudio();
          resolve(this.activePlaybackSeq !== seq);
        }, 4000);

        audio.onended = () => {
          if (isDone) return;
          isDone = true;
          cleanup();
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve(true);
        };

        audio.onerror = () => {
          if (isDone) return;
          isDone = true;
          destroyAudio();
          resolve(this.activePlaybackSeq !== seq);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (isDone) return;
            isDone = true;
            destroyAudio();
            resolve(this.activePlaybackSeq !== seq);
          });
        }
      } catch (err) {
        destroyAudio();
        resolve(this.activePlaybackSeq !== seq);
      }
    });
  }

  /**
   * 朗读英文单词、短语或句子
   * 单词/短语：100% 走纯正外教原声（结合预载强缓存秒开，绝不回退至机械 TTS 制造重音音色混杂）
   * 长例句/语法题：使用高品质系统神经网络 TTS
   */
  public static async speak(text: string, rate: number = 0.9): Promise<void> {
    if (typeof window === 'undefined') return;

    this.unlockAudioContext();

    const cleanText = text.trim();
    if (!cleanText) return;

    // 1. 彻底掐灭当前所有的旧音频与可能正在播放的系统 TTS，并递增时序版本号
    this.stop();
    const currentSeq = this.activePlaybackSeq;

    // 判定是否为单词或短语 (通常不包含标点句号问号叹号、不含超过 4 个单词且不含 blank 挖空)
    const isSingleWordOrShortPhrase =
      !cleanText.includes('.') &&
      !cleanText.includes('?') &&
      !cleanText.includes('!') &&
      cleanText.split(/\s+/).length <= 4 &&
      !cleanText.includes('blank');

    if (isSingleWordOrShortPhrase) {
      await this.playNativeAudio(cleanText, rate, currentSeq);
      // 单词/短语发音全由母语外教原声负责！
      // 无论成功与否，严禁降级到机械 TTS，彻底杜绝外教原声与机械音混杂双播！
      return;
    }

    // 如果在此期间用户点击了其他发音，放弃当前例句朗读
    if (this.activePlaybackSeq !== currentSeq) return;

    // 2. 长例句理解题、语法挖空等文本：启用高质量系统神经网络 TTS 朗读
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const voice = await this.selectBestVoice();
      if (this.activePlaybackSeq !== currentSeq) return;

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
   * 停止当前所有发音，彻底销毁音频对象与系统语音队列
   */
  public static stop(): void {
    // 递增时序版本号，使所有挂起的异步回调与超时立即失效
    this.activePlaybackSeq++;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
      } catch (e) {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
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
