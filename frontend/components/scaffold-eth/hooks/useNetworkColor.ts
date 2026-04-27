import { useEffect, useState } from "react";

export function useNetworkColor() {
  const [color, setColor] = useState("#533afd");
  return color;
}
export function getNetworkColor(chainId: number): string {
  return "#533afd";
}
