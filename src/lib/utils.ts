import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

export function formatConversationTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
}

export function formatLastSeen(dateString?: string, privacySetting: string = 'everyone'): string {
  if (privacySetting === 'nobody') return 'Offline';
  if (!dateString) return 'Offline';
  try {
    const date = new Date(dateString);
    const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);
    if (diffMinutes < 3) return 'Online';
    if (isToday(date)) return `Last seen today at ${format(date, "h:mm a")}`;
    if (isYesterday(date)) return `Last seen yesterday at ${format(date, "h:mm a")}`;
    return `Last seen ${format(date, "MMM d, yyyy")}`;
  } catch {
    return 'Offline';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function getInitials(name: string): string {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(identifier: string): string {
  const colors = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+91' + cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  return '+' + cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}
