import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { NewApiKey, RevokeKey } from "@/features/users/api-key-forms";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  await requirePageRole("ADMIN");
  const keys = await db.apiKey.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="API keys" description="Para que otros sistemas creen pedidos y consulten stock. Ver docs/API.md." actions={<NewApiKey />} />
      <Card>
        {keys.length === 0 ? <EmptyState title="No hay API keys" /> : (
          <Table>
            <thead><tr><Th>Nombre</Th><Th>Prefijo</Th><Th>Creada</Th><Th>Último uso</Th><Th>Estado</Th><Th /></tr></thead>
            <tbody>
              {keys.map((k) => (
                <Tr key={k.id}>
                  <Td className="font-semibold">{k.name}</Td>
                  <Td><Mono>{k.prefix}…</Mono></Td>
                  <Td className="text-muted">{fmtDateTime(k.createdAt)}</Td>
                  <Td className="text-muted">{fmtDateTime(k.lastUsedAt)}</Td>
                  <Td>{k.revokedAt ? <Badge tone="danger">Revocada</Badge> : <Badge tone="success">Activa</Badge>}</Td>
                  <Td className="text-right">{!k.revokedAt && <RevokeKey id={k.id} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
