const API = "http://127.0.0.1:8000";

export const getBuckets = async (): Promise<string[]> => {
  const res = await fetch(`${API}/workspace/buckets`);
  const data = await res.json();
  return data.buckets ?? [];
};

export const createBucket = async (name: string) => {
  const form = new FormData();
  form.append("name", `workspace-${name.toLowerCase()}`);
  const res = await fetch(`${API}/workspace/create-bucket`, {
    method: "POST",
    body: form,
  });
  return res.json();
};

export const deleteWorkspace = async (name: string) => {
  const form = new FormData();
  form.append("name", name);
  const res = await fetch(`${API}/workspace/delete-workspace`, {
    method: "DELETE",
    body: form,
  });
  return res.json();
};

export const listPdfs = async (workspace: string): Promise<string[]> => {
  const res = await fetch(`${API}/workspace/list-pdfs?workspace=${workspace}`);
  const data = await res.json();
  return data.pdfs ?? [];
};

export const uploadPdf = async (file: File, workspace: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("workspace", workspace);
  const res = await fetch(`${API}/workspace/upload-pdf`, {
    method: "POST",
    body: form,
  });
  return res.json();
};

export const deletePdf = async (workspace: string, filename: string) => {
  const form = new FormData();
  form.append("workspace", workspace);
  form.append("filename", filename);
  const res = await fetch(`${API}/workspace/delete-pdf`, {
    method: "DELETE",
    body: form,
  });
  return res.json();
};
