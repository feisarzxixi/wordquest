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

export class ClientSession {
  public static hasLoggedInUser(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (!stored) return false;
      const user = JSON.parse(stored);
      return !!(user && user.id && user.username);
    } catch (e) {
      return false;
    }
  }

  public static getCurrentUser(): UserSession | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.id) {
          this.syncCookie(user.id);
          return user;
        }
      }
    } catch (e) {
      console.warn('Load user from localStorage failed:', e);
    }

    return null;
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

  public static logout(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT);
      if (typeof document !== 'undefined') {
        document.cookie = 'studentId=; path=/; max-age=0; SameSite=Lax';
      }
      window.dispatchEvent(new CustomEvent('wq_user_changed', { detail: null }));
    } catch (e) {
      console.warn('Logout failed:', e);
    }
  }

  private static syncCookie(userId: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `studentId=${encodeURIComponent(userId)}; path=/; max-age=31536000; SameSite=Lax`;
  }

  public static getSavedProfiles(): UserSession[] {
    if (typeof window === 'undefined') return [];
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

    return [];
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
      const cur = this.getCurrentUser();
      if (cur && cur.id === userId) {
        if (list.length > 0) {
          this.setCurrentUser(list[0]);
        } else {
          this.logout();
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
    if (!user) return {};
    return {
      'x-student-id': user.id,
      'x-user-role': user.role,
    };
  }
}
