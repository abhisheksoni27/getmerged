"use client";

import dynamic from "next/dynamic";

const PhysicsCanvas = dynamic(
  () => import("@/components/PhysicsCanvas").then((mod) => mod.PhysicsCanvas),
  { ssr: false }
);

export function ClientPhysicsCanvas() {
  return <PhysicsCanvas />;
}
