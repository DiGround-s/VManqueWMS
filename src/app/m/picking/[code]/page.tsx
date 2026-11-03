import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PickRunner, TakeWave, WaveFinished } from "@/features/waves/pick-runner";

export default async function PhonePickWave({ params }: { params: Promise<{ code: string }> }) {
  const user = await requirePageRole();
  const { code } = await params;
  const wave = await db.wave.findUnique({ where: { code: decodeURIComponent(code).toUpperCase() }, select: { id: true, code: true, status: true, assignedUserId: true } });
  if (!wave) notFound();
  if (wave.status !== "OPEN" && wave.status !== "PICKING") return <WaveFinished code={wave.code} />;
  if (wave.status === "OPEN" || wave.assignedUserId !== user.id) return <TakeWave id={wave.id} code={wave.code} />;

  const [task, counts] = await Promise.all([
    db.pickTask.findFirst({
      where: { waveId: wave.id, status: "PENDING" },
      orderBy: { sequence: "asc" },
      select: { id: true, qtyRequired: true, qtyPicked: true, location: { select: { code: true } }, product: { select: { sku: true, name: true, barcode: true, imageUrl: true } } },
    }),
    db.pickTask.groupBy({ by: ["status"], where: { waveId: wave.id }, _count: true }),
  ]);
  if (!task) return <WaveFinished code={wave.code} />;
  const by = new Map(counts.map((c) => [c.status, c._count]));
  const total = counts.reduce((n, c) => n + c._count, 0);
  return (
    <PickRunner
      key={task.id + task.qtyPicked}
      waveCode={wave.code}
      progress={{ done: (by.get("DONE") ?? 0) + (by.get("SHORT") ?? 0), total }}
      task={{ id: task.id, location: task.location?.code ?? "", sku: task.product.sku, barcode: task.product.barcode, name: task.product.name, imageUrl: task.product.imageUrl, left: task.qtyRequired - task.qtyPicked }}
    />
  );
}
