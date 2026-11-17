export interface DriveImageFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  sharedPublicly: boolean;
  imageUrl: string;
}

const DRIVE_MENU_FOLDER_NAME = 'Dimsum Mentai 77 Menu';

export function getDrivePublicImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1200`;
}

async function parseDriveError(resp: Response, fallback: string): Promise<string> {
  try {
    const json = (await resp.json()) as { error?: { message?: string } };
    if (json?.error?.message) return json.error.message;
  } catch {
    // Ignore parse error
  }
  return fallback;
}

export async function ensureDriveMenuFolder(accessToken: string): Promise<string> {
  const q = `name = '${DRIVE_MENU_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name)&pageSize=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!searchResp.ok) {
    throw new Error(
      await parseDriveError(searchResp, 'Gagal mencari folder menu di Google Drive.')
    );
  }
  const searchJson = (await searchResp.json()) as {
    files?: Array<{ id: string; name: string }>;
  };
  if (searchJson.files && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_MENU_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createResp.ok) {
    throw new Error(
      await parseDriveError(createResp, 'Gagal membuat folder menu di Google Drive.')
    );
  }
  const created = (await createResp.json()) as { id: string };
  return created.id;
}

export async function shareDriveFilePublicly(
  accessToken: string,
  fileId: string
): Promise<void> {
  const permResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );
  if (!permResp.ok) {
    throw new Error(
      await parseDriveError(
        permResp,
        'Gagal mengatur izin akses publik untuk foto Google Drive.'
      )
    );
  }
}

export async function uploadImageToDrive(
  accessToken: string,
  file: File,
  customTitle?: string
): Promise<DriveImageFile> {
  const folderId = await ensureDriveMenuFolder(accessToken);

  const safePrefix = (customTitle || file.name || 'menu-dm77')
    .replace(/\.[^/.]+$/, '')
    .trim();
  const extMatch = file.name.match(/\.[a-z0-9]+$/i);
  const uploadName = `${safePrefix}${extMatch ? extMatch[0] : '.jpg'}`;

  const metadata = {
    name: uploadName,
    parents: [folderId],
    description: 'Foto menu resmi Dimsum Mentai 77 UNPAM',
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const uploadResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );
  if (!uploadResp.ok) {
    throw new Error(
      await parseDriveError(uploadResp, 'Gagal mengunggah foto ke Google Drive.')
    );
  }

  const uploaded = (await uploadResp.json()) as {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webViewLink?: string;
    modifiedTime?: string;
  };

  await shareDriveFilePublicly(accessToken, uploaded.id);

  return {
    id: uploaded.id,
    name: uploaded.name,
    mimeType: uploaded.mimeType,
    thumbnailLink: uploaded.thumbnailLink,
    webViewLink: uploaded.webViewLink,
    modifiedTime: uploaded.modifiedTime,
    sharedPublicly: true,
    imageUrl: getDrivePublicImageUrl(uploaded.id),
  };
}

export async function listDriveImageFiles(
  accessToken: string,
  searchQuery?: string
): Promise<DriveImageFile[]> {
  let q = "mimeType contains 'image/' and trashed = false";
  const cleanSearch = (searchQuery || '').trim().replace(/'/g, "\\'");
  if (cleanSearch) {
    q += ` and name contains '${cleanSearch}'`;
  }

  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&orderBy=modifiedTime%20desc&pageSize=24&fields=files(id,name,mimeType,thumbnailLink,webViewLink,modifiedTime,permissions(id,type,role))`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!resp.ok) {
    throw new Error(
      await parseDriveError(resp, 'Gagal memuat daftar gambar dari Google Drive.')
    );
  }

  const json = (await resp.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      thumbnailLink?: string;
      webViewLink?: string;
      modifiedTime?: string;
      permissions?: Array<{ id: string; type: string; role: string }>;
    }>;
  };

  return (json.files || []).map((f) => {
    const sharedPublicly = Boolean(
      f.permissions?.some((p) => p.type === 'anyone' && p.role === 'reader')
    );
    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      thumbnailLink: f.thumbnailLink,
      webViewLink: f.webViewLink,
      modifiedTime: f.modifiedTime,
      sharedPublicly,
      imageUrl: getDrivePublicImageUrl(f.id),
    };
  });
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!resp.ok) {
    throw new Error(
      await parseDriveError(resp, 'Gagal menghapus file dari Google Drive.')
    );
  }
}

export async function backupCatalogToDrive(
  accessToken: string,
  catalogPayload: Record<string, unknown>
): Promise<{ id: string; name: string }> {
  const folderId = await ensureDriveMenuFolder(accessToken);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const fileName = `dimsum-77-backup-${stamp}.json`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append(
    'file',
    new Blob([JSON.stringify(catalogPayload, null, 2)], {
      type: 'application/json',
    })
  );

  const resp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );
  if (!resp.ok) {
    throw new Error(
      await parseDriveError(resp, 'Gagal menyimpan backup menu ke Google Drive.')
    );
  }
  return (await resp.json()) as { id: string; name: string };
}
