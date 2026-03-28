import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export type StoredImageAsset = {
  path: string;
  mimeType: string;
  sha256: string;
  size: number;
  base64: string;
};

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const MANAGED_UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads', 'managed');
const UPLOADS_PREFIX = '/uploads/';
const MANAGED_UPLOADS_PREFIX = '/uploads/managed/';

function normalizeMimeType(value: string | null | undefined) {
  const mimeType = (value || 'image/png').toLowerCase();
  return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
}

export function createDataUrlFromBuffer(buffer: Buffer, mimeType: string | null | undefined) {
  return `data:${normalizeMimeType(mimeType)};base64,${buffer.toString('base64')}`;
}

function getExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

function getMimeTypeForExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: normalizeMimeType(match[1]),
    base64: match[2],
  };
}

function getAbsolutePathFromManagedUrl(assetPath: string) {
  if (!assetPath.startsWith(UPLOADS_PREFIX)) {
    throw new Error(`Unsupported upload asset path: ${assetPath}`);
  }

  const relativePath = assetPath.replace(/^\/+/, '');
  const absolutePath = path.normalize(path.join(PUBLIC_DIR, relativePath));
  const uploadsRoot = path.normalize(`${UPLOADS_DIR}${path.sep}`);
  if (!absolutePath.startsWith(uploadsRoot)) {
    throw new Error(`Upload asset path escaped uploads directory: ${assetPath}`);
  }
  return absolutePath;
}

async function writeFileAtomically(targetPath: string, buffer: Buffer, suffix: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  try {
    const existing = await fs.readFile(targetPath);
    const existingHash = createHash('sha256').update(existing).digest('hex');
    const nextHash = createHash('sha256').update(buffer).digest('hex');
    if (existingHash === nextHash) {
      return;
    }
  } catch {
    // file does not exist yet
  }

  const tempPath = `${targetPath}.${process.pid}.${suffix}.tmp`;
  await fs.writeFile(tempPath, buffer);
  try {
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

export function isManagedUploadPath(value: string | null | undefined) {
  return typeof value === 'string' && value.startsWith(MANAGED_UPLOADS_PREFIX);
}

export function isUploadPath(value: string | null | undefined) {
  return typeof value === 'string' && value.startsWith(UPLOADS_PREFIX);
}

export async function storeImageBuffer(buffer: Buffer, mimeType: string) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const extension = getExtensionForMimeType(normalizedMimeType);
  const subdir = sha256.slice(0, 2);
  const fileName = `${sha256}.${extension}`;
  const absolutePath = path.join(MANAGED_UPLOADS_DIR, subdir, fileName);
  const publicPath = `/uploads/managed/${subdir}/${fileName}`;

  await writeFileAtomically(absolutePath, buffer, 'write');

  return {
    publicPath,
    sha256,
    mimeType: normalizedMimeType,
    size: buffer.byteLength,
  };
}

export async function storeDataUrl(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Invalid data URL');
  }
  return storeImageBuffer(Buffer.from(parsed.base64, 'base64'), parsed.mimeType);
}

export async function readImageUrlAsBase64(imageUrl: string) {
  const parsed = parseDataUrl(imageUrl);
  if (parsed) {
    return parsed;
  }

  if (isUploadPath(imageUrl)) {
    const absolutePath = getAbsolutePathFromManagedUrl(imageUrl);
    const buffer = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).slice(1);
    return {
      mimeType: getMimeTypeForExtension(extension),
      base64: buffer.toString('base64'),
    };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }

  return {
    mimeType: normalizeMimeType(response.headers.get('content-type')),
    base64: Buffer.from(await response.arrayBuffer()).toString('base64'),
  };
}

export async function buildManagedAssetRecord(assetPath: string): Promise<StoredImageAsset | null> {
  if (!isUploadPath(assetPath)) return null;

  const absolutePath = getAbsolutePathFromManagedUrl(assetPath);
  const buffer = await fs.readFile(absolutePath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const extension = path.extname(absolutePath).slice(1);

  return {
    path: assetPath,
    mimeType: getMimeTypeForExtension(extension),
    sha256,
    size: buffer.byteLength,
    base64: buffer.toString('base64'),
  };
}

export async function restoreManagedAsset(asset: StoredImageAsset) {
  if (!isUploadPath(asset.path)) {
    throw new Error(`Unsupported asset path in backup: ${asset.path}`);
  }

  const buffer = Buffer.from(asset.base64, 'base64');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== asset.sha256) {
    throw new Error(`Asset hash mismatch for ${asset.path}`);
  }

  const absolutePath = getAbsolutePathFromManagedUrl(asset.path);
  await writeFileAtomically(absolutePath, buffer, 'restore');
}
