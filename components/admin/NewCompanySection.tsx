"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CompanyForm } from "./CompanyForm";

export function NewCompanySection() {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <CompanyForm onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />;
  }

  return (
    <div>
      <Button type="button" variant="primary" onClick={() => setCreating(true)}>
        <Plus size={16} />
        Nova Empresa
      </Button>
    </div>
  );
}
