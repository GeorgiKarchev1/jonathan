"use client";

import { PageHeader } from "@/components/shared";
import { FileExplorer } from "@/components/FileExplorer";
import { Paperclip } from "@/components/icons";

export default function FilesPage() {
  return (
    <div>
      <PageHeader
        title="Файлове"
        subtitle="Файловата система, подредена по клиенти и проекти."
        icon={<Paperclip size={20} />}
      />
      <div className="p-5 sm:p-8">
        <FileExplorer />
      </div>
    </div>
  );
}
