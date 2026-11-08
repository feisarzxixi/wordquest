/**
 * 客户端多账号与设备会话管理 (Client Multi-Account Profile Manager)
 * 专为 iPad 设计：支持一台设备保存多个学生档案，无需反复输入长密码，一键秒切账号
 */

export interface UserSession {
  id: string;
  username: string;
  realName: string;
  role: 'admin' | 'student';
}

const STORAGE_KEY_CURRENT = 'wq_current_user';
const STORAGE_KEY_PROFILES = 'wq_saved_profiles';

const DEFAULT_GUEST: UserSession = {
  id: 'student-default',
  username: 'student',
  realName: '张同学',
  role: 'student',
};

export class ClientSession {
  public static getCurrentUser(): UserSession {
    if (typeof window === 'undefined') return DEFAULT_GUEST;

    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (stored) {
        const user = JSON.parse(stored);
        this.syncCookie(user.id);
        return user;
      }
    } catch (e) {
      console.warn('Load user from localStorage failed:', e);
    }

    this.setCurrentUser(DEFAULT_GUEST);
    this.addSavedProfile(DEFAULT_GUEST);
    return DEFAULT_GUEST;
  }

  public static setCurrentUser(user: UserSession): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(user));
      this.syncCookie(user.id);
      this.addSavedProfile(user);
      window.dispatchEvent(new CustomEvent('wq_user_changed', { detail: user }));
    } catch (e) {
      console.warn('Save user failed:', e);
    }
  }

  private static syncCookie(userId: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `studentId=${encodeURIComponent(userId)}; path=/; max-age=31536000; SameSite=Lax`;
  }

  public static getSavedProfiles(): UserSession[] {
    if (typeof window === 'undefined') return [DEFAULT_GUEST];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (raw) {
        const parsed: UserSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Load profiles failed:', e);
    }

    return [DEFAULT_GUEST];
  }

  public static addSavedProfile(user: UserSession): void {
    if (typeof window === 'undefined' || user.role === 'admin') return;
    try {
      const list = this.getSavedProfiles().filter((p) => p.id !== user.id);
      list.push(user);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
    } catch (e) {
      console.warn('Add profile failed:', e);
    }
  }

  public static removeSavedProfile(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getSavedProfiles().filter((p) => p.id !== userId);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
      if (this.getCurrentUser().id === userId) {
        if (list.length > 0) {
          this.setCurrentUser(list[0]);
        } else {
          this.setCurrentUser(DEFAULT_GUEST);
        }
      }
    } catch (e) {
      console.warn('Remove profile failed:', e);
    }
  }

  public static switchProfile(userId: string): UserSession | null {
    const list = this.getSavedProfiles();
    const target = list.find((p) => p.id === userId);
    if (target) {
      this.setCurrentUser(target);
      return target;
    }
    return null;
  }

  public static getAuthHeaders(): Record<string, string> {
    const user = this.getCurrentUser();
    return {
      'x-student-id': user.id,
      'x-user-role': user.role,
    };
  }
}
