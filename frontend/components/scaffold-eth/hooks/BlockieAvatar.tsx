"use client";

export function BlockieAvatar({ address, size }: { address: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#533afd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: size * 0.4,
        fontWeight: "bold",
      }}
    >
      {address?.slice(2, 4).toUpperCase() || "??"}
    </div>
  );
}
