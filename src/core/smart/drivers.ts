import { parseAlg, type Move } from "../cube/notation";
import { stateFromFacelets, type CubeState } from "../cube/sim";
import type { SmartCube, SmartDriver, SmartMoveEvent } from "./types";

const FACE_FAMILIES = new Set(["U", "R", "F", "D", "L", "B"]);

function parseFaceMove(s: string): Move | null {
  try {
    const m = parseAlg(s);
    if (m.length === 1 && FACE_FAMILIES.has(m[0]!.family)) return m[0]!;
    return null;
  } catch {
    return null;
  }
}

/** Implémentation commune : un émetteur d'événements minimal. */
class BaseCube {
  protected moveCbs = new Set<(e: SmartMoveEvent) => void>();
  protected stateCbs = new Set<(s: CubeState) => void>();
  protected disconnectCbs = new Set<() => void>();
  onMove(cb: (e: SmartMoveEvent) => void) {
    this.moveCbs.add(cb);
    return () => void this.moveCbs.delete(cb);
  }
  onState(cb: (s: CubeState) => void) {
    this.stateCbs.add(cb);
    return () => void this.stateCbs.delete(cb);
  }
  onDisconnect(cb: () => void) {
    this.disconnectCbs.add(cb);
    return () => void this.disconnectCbs.delete(cb);
  }
  protected emitMove(m: Move) {
    const e = { move: m, at: performance.now() };
    this.moveCbs.forEach((cb) => cb(e));
  }
  protected emitDisconnect() {
    this.disconnectCbs.forEach((cb) => cb());
  }
}

// ---------------------------------------------------------------------------
// GAN (Gen2 / Gen3 / Gen4 : 356 i, Monster Go, MoYu AI… selon support de la lib) — gan-web-bluetooth
// ---------------------------------------------------------------------------
class GanSmartCube extends BaseCube implements SmartCube {
  readonly driverId = "gan";
  private unsub: { unsubscribe(): void } | null = null;
  private battery: number | null = null;
  constructor(
    readonly name: string,
    private conn: import("gan-web-bluetooth").GanCubeConnection,
  ) {
    super();
    this.unsub = conn.events$.subscribe((ev) => {
      if (ev.type === "MOVE") {
        const m = parseFaceMove(ev.move);
        if (m) this.emitMove(m);
      } else if (ev.type === "FACELETS") {
        const st = stateFromFacelets(ev.facelets);
        if (st) this.stateCbs.forEach((cb) => cb(st));
      } else if (ev.type === "BATTERY") {
        this.battery = ev.batteryLevel;
      } else if (ev.type === "DISCONNECT") {
        this.emitDisconnect();
      }
    });
  }
  requestState = async () => {
    await this.conn.sendCubeCommand({ type: "REQUEST_FACELETS" });
  };
  resetToSolved = async () => {
    await this.conn.sendCubeCommand({ type: "REQUEST_RESET" });
  };
  batteryLevel = async () => {
    try {
      await this.conn.sendCubeCommand({ type: "REQUEST_BATTERY" });
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      /* ignore */
    }
    return this.battery;
  };
  async disconnect() {
    this.unsub?.unsubscribe();
    await this.conn.disconnect();
  }
}

export const ganDriver: SmartDriver = {
  id: "gan",
  label: "GAN / MoYu (Bluetooth)",
  hint: "GAN 356 i / i2 / i3 / Carry / Monster Go et cubes compatibles. Chrome ou Edge requis.",
  supported: () => typeof navigator !== "undefined" && "bluetooth" in navigator,
  async connect() {
    const { connectGanCube } = await import("gan-web-bluetooth");
    const conn = await connectGanCube(async (_device, isFallback) => {
      if (!isFallback) return null; // d'abord, lecture automatique
      return window.prompt(
        "Impossible de lire l'adresse MAC automatiquement.\nEntre l'adresse MAC de ton cube (ex. AB:12:34:CD:56:EF).\nAstuce : visible dans l'app du fabricant ou dans chrome://bluetooth-internals.",
      );
    });
    return new GanSmartCube(conn.deviceName, conn);
  },
};

// ---------------------------------------------------------------------------
// cubing.js : GoCube, Rubik's Connect / GiiKER, GAN 1re génération
// ---------------------------------------------------------------------------
class CubingSmartCube extends BaseCube implements SmartCube {
  readonly driverId = "cubing";
  constructor(
    readonly name: string,
    private puzzle: import("cubing/bluetooth").BluetoothPuzzle,
  ) {
    super();
    puzzle.addAlgLeafListener((e) => {
      const m = parseFaceMove(e.latestAlgLeaf.toString());
      if (m) this.emitMove(m);
    });
  }
  async disconnect() {
    this.puzzle.disconnect();
    this.emitDisconnect();
  }
}

export const cubingDriver: SmartDriver = {
  id: "cubing",
  label: "GoCube / Rubik's Connect / GiiKER",
  hint: "Cubes supportés par cubing.js (GoCube, Rubik's Connect, GiiKER, ancien GAN). Chrome ou Edge requis.",
  supported: () => typeof navigator !== "undefined" && "bluetooth" in navigator,
  async connect() {
    const { connectSmartPuzzle } = await import("cubing/bluetooth");
    const puzzle = await connectSmartPuzzle();
    return new CubingSmartCube(puzzle.name() ?? "Smart cube", puzzle);
  },
};

// ---------------------------------------------------------------------------
// Simulateur clavier / boutons : tester le mode smart sans matériel
// ---------------------------------------------------------------------------
export class VirtualCube extends BaseCube implements SmartCube {
  readonly driverId = "virtual";
  readonly name = "Cube virtuel (clavier)";
  private keyHandler = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    const k = e.key;
    const lower = k.toLowerCase();
    if (!"urfdlb".includes(lower) || k.length !== 1) return;
    e.preventDefault();
    this.push(`${lower.toUpperCase()}${k === lower ? "" : "'"}`);
  };
  constructor() {
    super();
    window.addEventListener("keydown", this.keyHandler);
  }
  push(move: string) {
    const m = parseFaceMove(move);
    if (m) this.emitMove(m);
  }
  async disconnect() {
    window.removeEventListener("keydown", this.keyHandler);
    this.emitDisconnect();
  }
}

export const virtualDriver: SmartDriver = {
  id: "virtual",
  label: "Cube virtuel (clavier / boutons)",
  hint: "Pour tester sans cube : touches u r f d l b (Maj = inverse) ou boutons à l'écran.",
  supported: () => true,
  async connect() {
    return new VirtualCube();
  },
};

export const SMART_DRIVERS: SmartDriver[] = [ganDriver, cubingDriver, virtualDriver];
