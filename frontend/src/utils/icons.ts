import {
  mdiDownload,
  mdiLinkVariant,
  mdiPencil,
  mdiFolderOutline,
  mdiTrashCanOutline,
  mdiRefresh,
  mdiHomeOutline,
  mdiImageOutline,
  mdiVideoOutline,
  mdiMusicNoteOutline,
  mdiFileOutline,
  mdiFilePdfBox,
  mdiZipBox,
  mdiFileDocumentOutline,
  mdiCodeBraces,
  mdiLanguageHtml5,
  mdiFileExcelBox,
  mdiFilePowerpointBox,
  mdiAlertCircleOutline,
  mdiInformationOutline,
  mdiCheckCircleOutline,
  mdiCloseCircleOutline,
  mdiArrowUp,
  mdiArrowDown
} from '@mdi/js';
import {
  mdiFormatSize,
  mdiClockOutline
} from '@mdi/js';
import { mdiPause, mdiPlay, mdiStop, mdiCloseCircleOutline as mdiCancel } from '@mdi/js';

export type SvgSize = number | string;

export function svgPath(path: string, size: SvgSize = 16, className = 'icon'): string {
  const width = typeof size === 'number' ? String(size) : size;
  const height = typeof size === 'number' ? String(size) : size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="currentColor" class="${className}"><path d="${path}"></path></svg>`;
}

export const actionIcons = {
  download: (size: SvgSize = 18) => svgPath(mdiDownload, size),
  share: (size: SvgSize = 18) => svgPath(mdiLinkVariant, size),
  edit: (size: SvgSize = 18) => svgPath(mdiPencil, size),
  move: (size: SvgSize = 18) => svgPath(mdiFolderOutline, size),
  delete: (size: SvgSize = 18) => svgPath(mdiTrashCanOutline, size),
  replace: (size: SvgSize = 18) => svgPath(mdiRefresh, size),
  refresh: (size: SvgSize = 18) => svgPath(mdiRefresh, size),
  home: (size: SvgSize = 18) => svgPath(mdiHomeOutline, size),
  arrowUp: (size: SvgSize = 16) => svgPath(mdiArrowUp, size),
  arrowDown: (size: SvgSize = 16) => svgPath(mdiArrowDown, size),
  pause: (size: SvgSize = 18) => svgPath(mdiPause, size),
  resume: (size: SvgSize = 18) => svgPath(mdiPlay, size),
  stop: (size: SvgSize = 18) => svgPath(mdiStop, size),
  cancel: (size: SvgSize = 18) => svgPath(mdiCancel, size)
} as const;

// メタデータ用の小型アイコン
export const metaIcons = {
  size: (size: SvgSize = 16) => svgPath(mdiFormatSize, size),
  downloads: (size: SvgSize = 16) => svgPath(mdiDownload, size),
  date: (size: SvgSize = 16) => svgPath(mdiClockOutline, size),
  folder: (size: SvgSize = 16) => svgPath(mdiFolderOutline, size)
} as const;

export function messageIcon(type: 'success' | 'error' | 'warning' | 'info', size: SvgSize = 16): string {
  switch (type) {
    case 'success':
      return svgPath(mdiCheckCircleOutline, size);
    case 'error':
      return svgPath(mdiCloseCircleOutline, size);
    case 'warning':
      return svgPath(mdiAlertCircleOutline, size);
    case 'info':
    default:
      return svgPath(mdiInformationOutline, size);
  }
}

export function fileIconForMime(mimeType: string, size: SvgSize = 18): string {
  if (!mimeType) return svgPath(mdiFileOutline, size);
  if (mimeType.startsWith('image/')) return svgPath(mdiImageOutline, size);
  if (mimeType.startsWith('video/')) return svgPath(mdiVideoOutline, size);
  if (mimeType.startsWith('audio/')) return svgPath(mdiMusicNoteOutline, size);
  if (mimeType.includes('pdf')) return svgPath(mdiFilePdfBox, size);
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return svgPath(mdiZipBox, size);
  if (mimeType.includes('text') || mimeType.includes('plain')) return svgPath(mdiFileDocumentOutline, size);
  if (mimeType.includes('javascript') || mimeType.includes('json')) return svgPath(mdiCodeBraces, size);
  if (mimeType.includes('html') || mimeType.includes('xml')) return svgPath(mdiLanguageHtml5, size);
  if (mimeType.includes('word') || mimeType.includes('document')) return svgPath(mdiFileDocumentOutline, size);
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return svgPath(mdiFileExcelBox, size);
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return svgPath(mdiFilePowerpointBox, size);
  return svgPath(mdiFileOutline, size);
}

export function fileIconForExt(ext: string, size: SvgSize = 18): string {
  const e = (ext || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(e)) return svgPath(mdiImageOutline, size);
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(e)) return svgPath(mdiVideoOutline, size);
  if (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma'].includes(e)) return svgPath(mdiMusicNoteOutline, size);
  if (['pdf'].includes(e)) return svgPath(mdiFilePdfBox, size);
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(e)) return svgPath(mdiFileDocumentOutline, size);
  if (['xls', 'xlsx', 'csv'].includes(e)) return svgPath(mdiFileExcelBox, size);
  if (['ppt', 'pptx'].includes(e)) return svgPath(mdiFilePowerpointBox, size);
  if (['zip', 'rar', 'lzh', '7z', 'tar', 'gz'].includes(e)) return svgPath(mdiZipBox, size);
  if (['html', 'css', 'js', 'json', 'xml', 'sql', 'ts', 'tsx'].includes(e)) return svgPath(mdiCodeBraces, size);
  return svgPath(mdiFileOutline, size);
}


