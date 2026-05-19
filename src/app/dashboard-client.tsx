"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  Briefcase,
  Lock,
  Layers,
  CheckCircle,
  Plus,
  RefreshCw,
  X,
  Menu,
  FileText,
  AlertCircle,
  ShieldCheck,
  Calendar,
  ChevronRight,
  User,
  Coffee,
  Coins,
  Settings,
  ArrowDownRight,
  FileDown,
  Upload,
  AlertTriangle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  registrarMovimiento,
  cerrarCajaDiaria,
  abrirNuevaCaja,
  crearTareaJefe,
  cotizarTareaJefe,
  guardarYMarcarLiquidacionComoPagada,
  getEstadoCaja,
  getDashboardData,
  getMovimientosHoy,
  getMovimientosFiltrados,
  getTareasJefe,
  getLiquidaciones,
  exportarBaseDatos,
  importarBaseDatos,
  getHistorialCierres
} from "./actions";

// ----------------------------------------------------
// HIGH-FIDELITY WEB AUDIO HAPTIC CHIMES SYNTHESIZER
// ----------------------------------------------------
class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("pos_audio_enabled") !== "false";
    }
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_audio_enabled", this.enabled.toString());
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    
    // Pleasant high-pitched double "ding-ding" chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);
    
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Soft detuned low triangle error chord
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(140, now);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(145, now);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playUnlock() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Cyberpunk-style upward swoosh sound
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.18);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

const sound = new SoundSystem();

// ----------------------------------------------------
// DRY ARCHITECTURAL HELPER FUNCTIONS
// ----------------------------------------------------
export function formatCurrency(value: number): string {
  return `S/. ${value.toFixed(2)}`;
}

export function formatLocalDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }) + " • " + dateObj.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

interface DashboardClientProps {
  initialCaja: any;
  initialDashboard: any;
  initialMovimientos: any[];
  initialTareas: any[];
  initialLiquidaciones: any;
}

export default function DashboardClient({
  initialCaja,
  initialDashboard,
  initialMovimientos,
  initialTareas,
  initialLiquidaciones
}: DashboardClientProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "pos" | "tareas" | "cierre" | "liquidaciones">("pos");
  const [isJefeMode, setIsJefeMode] = useState<boolean>(false);

  // Premium Authentication & Sound States
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [sessionRole, setSessionRole] = useState<"Operador" | "Jefe" | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [activeLoginRole, setActiveLoginRole] = useState<"Operador" | "Jefe" | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Admin PIN prompt auth modal
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalPin, setAuthModalPin] = useState<string>("");
  const [authModalPurpose, setAuthModalPurpose] = useState<string>("");
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null);

  // DB Sync State
  const [cajaState, setCajaState] = useState(initialCaja);
  const [dashboardState, setDashboardState] = useState(initialDashboard);
  const [movimientos, setMovimientos] = useState(initialMovimientos);
  const [tareas, setTareas] = useState(initialTareas);
  const [liquidaciones, setLiquidaciones] = useState(initialLiquidaciones);
  const [mounted, setMounted] = useState(false);

  // Filter and input states for movements & custom services
  const [posOtroDesc, setPosOtroDesc] = useState<string>("");
  const [rangoMovimientos, setRangoMovimientos] = useState<"hoy" | "semana" | "mes">("hoy");

  // Print engine states
  const [activePrint, setActivePrint] = useState<"cierre" | "liquidacion" | null>(null);
  const [selectedLiquidacionPrint, setSelectedLiquidacionPrint] = useState<any>(null);
  const [selectedCierrePrint, setSelectedCierrePrint] = useState<any>(null);

  // Mobile Hamburger Menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // General Settings & Backup States
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(true);
  const [autoLockTime, setAutoLockTime] = useState<number>(10 * 60 * 1000); // 10 minutes default
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState<boolean>(false);
  const [showConfirmImportModal, setShowConfirmImportModal] = useState<boolean>(false);
  const [importFileContent, setImportFileContent] = useState<any>(null);
  const [cierreHistory, setCierreHistory] = useState<any[]>([]);

  // Import Database States
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [importKeywordConfirm, setImportKeywordConfirm] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setSoundEnabled(sound.isEnabled());
    
    // Load session from localStorage
    const savedRole = localStorage.getItem("pos_session_role");
    if (savedRole === "Operador") {
      setIsLocked(false);
      setSessionRole("Operador");
      setIsJefeMode(false);
    } else if (savedRole === "Jefe") {
      setIsLocked(false);
      setSessionRole("Jefe");
      setIsJefeMode(true);
    }

    // Load auto-lock configurations
    const savedAutoLock = localStorage.getItem("pos_autolock_enabled");
    if (savedAutoLock !== null) {
      setAutoLockEnabled(savedAutoLock === "true");
    }
    const savedAutoLockTime = localStorage.getItem("pos_autolock_time");
    if (savedAutoLockTime !== null) {
      setAutoLockTime(parseInt(savedAutoLockTime));
    }

    // Load past closures history for Jefe
    const loadCierreHistory = async () => {
      try {
        const hist = await getHistorialCierres();
        setCierreHistory(hist);
      } catch (e) {
        console.error(e);
      }
    };
    loadCierreHistory();
  }, []);

  // Idle Timer Auto-Lock Hook
  useEffect(() => {
    if (isLocked || !autoLockEnabled || !mounted) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
        setSessionRole(null);
        setIsJefeMode(false);
        localStorage.removeItem("pos_session_role");
        showNotification("error", "Terminal bloqueada por inactividad");
      }, autoLockTime);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isLocked, autoLockEnabled, autoLockTime, mounted]);

  // Trigger Native PDF Print Dialog
  useEffect(() => {
    if (activePrint) {
      const timer = setTimeout(() => {
        window.print();
        // Clear active print so the screen layout returns to normal
        setActivePrint(null);
        setSelectedCierrePrint(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activePrint]);

  // Fetch movements whenever filter range changes
  useEffect(() => {
    if (mounted) {
      startTransition(async () => {
        try {
          const res = await getMovimientosFiltrados(rangoMovimientos);
          setMovimientos(res);
        } catch (err) {
          console.error(err);
        }
      });
    }
  }, [rangoMovimientos, mounted]);

  const [isPending, startTransition] = useTransition();
  const [notif, setNotif] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync helper
  const refreshAllData = async () => {
    try {
      const c = await getEstadoCaja();
      const d = await getDashboardData();
      const m = await getMovimientosFiltrados(rangoMovimientos);
      const t = await getTareasJefe();
      const l = await getLiquidaciones();

      setCajaState(c);
      setDashboardState(d);
      setMovimientos(m);
      setTareas(t);
      setLiquidaciones(l);
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (type: "success" | "error", text: string) => {
    setNotif({ type, text });
    if (type === "success") {
      sound.playSuccess();
    } else if (type === "error") {
      sound.playError();
    }
    setTimeout(() => setNotif(null), 4000);
  };

  // --- Backup Restoration Handler Functions ---

  const handleExportData = async () => {
    try {
      const backupJson = await exportarBaseDatos();
      const blob = new Blob([JSON.stringify(backupJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_superpos_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        JSON.parse(content); // validate JSON structure client-side first
        setPendingImportData(content);
        setImportKeywordConfirm("");
        setShowConfirmImportModal(true);
      } catch (err) {
        showNotification("error", "El archivo cargado no es un JSON de respaldo válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExecuteImport = () => {
    if (importKeywordConfirm !== "IMPORTAR" || !pendingImportData) {
      showNotification("error", "Clave de confirmación incorrecta.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await importarBaseDatos(pendingImportData);
        if (res.success) {
          showNotification("success", "Base de datos restaurada correctamente. Recargando terminal...");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showNotification("error", res.error || "Error al restaurar respaldo.");
        }
      } catch (err: any) {
        showNotification("error", err.message || "Error al realizar restauración.");
      } finally {
        setShowConfirmImportModal(false);
        setPendingImportData(null);
        setImportKeywordConfirm("");
      }
    });
  };

  // --- POS State & Logic ---
  const CATEGORIAS = ["Tipeos", "Diseño Gráfico", "Copias / Impresiones", "Diapositivas", "Servicios Web", "Otros"];
  const PRESETS = [
    { name: "Impresión B/N", price: 0.50, category: "Copias / Impresiones" },
    { name: "Impresión Color", price: 1.00, category: "Copias / Impresiones" },
    { name: "Fotocopia B/N", price: 0.20, category: "Copias / Impresiones" },
    { name: "Fotocopia Color", price: 0.60, category: "Copias / Impresiones" },
    { name: "Tipeo Simple (Pág)", price: 2.50, category: "Tipeos" },
    { name: "Diapositiva Simple", price: 3.00, category: "Diapositivas" },
    { name: "Diseño Rápido", price: 5.00, category: "Diseño Gráfico" },
    { name: "Plastificado", price: 3.00, category: "Otros" },
    { name: "Anillado Espiral", price: 4.00, category: "Otros" },
  ];
  const [posCategory, setPosCategory] = useState<string>("Tipeos");
  const [posTotal, setPosTotal] = useState<string>("");
  const [posCashReceived, setPosCashReceived] = useState<string>("");
  const [posYapeReceived, setPosYapeReceived] = useState<string>("");
  const [posChangeTarget, setPosChangeTarget] = useState<"Efectivo" | "Yape">("Efectivo");

  // Calculated values
  const totalReceived = (parseFloat(posCashReceived) || 0) + (parseFloat(posYapeReceived) || 0);
  const changeValue = Math.max(0, totalReceived - (parseFloat(posTotal) || 0));
  const changeRequired = changeValue > 0;

  const handlePOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const serviceVal = parseFloat(posTotal) || 0;
    const cashVal = parseFloat(posCashReceived) || 0;
    const yapeVal = parseFloat(posYapeReceived) || 0;

    if (serviceVal <= 0) {
      showNotification("error", "El monto del servicio debe ser mayor a 0");
      return;
    }

    if (posCategory === "Otros" && !posOtroDesc.trim()) {
      showNotification("error", "Por favor, especifica la descripción del servicio");
      return;
    }

    if (cashVal + yapeVal < serviceVal) {
      showNotification("error", `El dinero recibido (S/. ${(cashVal + yapeVal).toFixed(2)}) es insuficiente para cubrir S/. ${serviceVal.toFixed(2)}`);
      return;
    }

    const changeCash = posChangeTarget === "Efectivo" ? changeValue : 0;
    const changeYape = posChangeTarget === "Yape" ? changeValue : 0;
    const finalCategory = posCategory === "Otros" ? `Otros: ${posOtroDesc.trim()}` : posCategory;

    startTransition(async () => {
      try {
        await registrarMovimiento({
          categoria: finalCategory,
          tipo: "Ingreso",
          monto_total: serviceVal,
          ingreso_efectivo: cashVal,
          ingreso_yape: yapeVal,
          salida_vuelto_efectivo: changeCash,
          salida_vuelto_yape: changeYape
        });
        showNotification("success", "Venta registrada correctamente");
        // Reset POS Form
        setPosTotal("");
        setPosCashReceived("");
        setPosYapeReceived("");
        setPosCategory("Tipeos");
        setPosOtroDesc("");
        await refreshAllData();
      } catch (err: any) {
        showNotification("error", err.message || "Error al registrar");
      }
    });
  };

  // --- Tareas Jefe State & Logic ---
  const [jefeDesc, setJefeDesc] = useState<string>("");
  const [quotePrices, setQuotePrices] = useState<{ [id: string]: string }>({});
  const [quoteMethods, setQuoteMethods] = useState<Record<string, "Efectivo" | "Yape">>({});

  const handleCreateJefeTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jefeDesc.trim()) return;

    startTransition(async () => {
      try {
        await crearTareaJefe(jefeDesc);
        showNotification("success", "Tarea del jefe registrada en estado Pendiente");
        setJefeDesc("");
        await refreshAllData();
      } catch (err: any) {
        showNotification("error", "Error al crear tarea");
      }
    });
  };

  const handleQuoteTask = async (id: string) => {
    const priceStr = quotePrices[id];
    const price = parseFloat(priceStr);
    const method = quoteMethods[id] || "Yape";
    if (isNaN(price) || price < 0) {
      showNotification("error", "Ingresa un precio válido");
      return;
    }

    startTransition(async () => {
      try {
        await cotizarTareaJefe(id, price, method);
        showNotification("success", `Precio asignado. Inyectado a caja de hoy como ${method}.`);
        setQuotePrices(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setQuoteMethods(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        await refreshAllData();
      } catch (err: any) {
        showNotification("error", "Error al asignar cotización");
      }
    });
  };

  // --- Authentication PIN Numpad Handlers ---
  const handlePinSubmit = () => {
    if (!activeLoginRole) return;
    const requiredPin = activeLoginRole === "Jefe" ? "0000" : "1234";
    if (pinInput === requiredPin) {
      sound.playUnlock();
      setIsLocked(false);
      setSessionRole(activeLoginRole);
      setIsJefeMode(activeLoginRole === "Jefe");
      localStorage.setItem("pos_session_role", activeLoginRole);
      showNotification("success", `¡Sesión iniciada como ${activeLoginRole === "Jefe" ? "Administrador" : "Operador"}!`);
      setPinInput("");
      setActiveLoginRole(null);
    } else {
      sound.playError();
      showNotification("error", "PIN Incorrecto");
      setPinInput("");
    }
  };

  const handleNumpadPress = (val: string) => {
    if (val === "C") {
      setPinInput("");
    } else if (val === "E") {
      handlePinSubmit();
    } else {
      if (pinInput.length < 6) {
        setPinInput(prev => prev + val);
      }
    }
  };

  const handleLogout = () => {
    setIsLocked(true);
    setSessionRole(null);
    setIsJefeMode(false);
    localStorage.removeItem("pos_session_role");
    setPinInput("");
    setActiveLoginRole(null);
    showNotification("success", "Sesión cerrada de forma segura.");
  };

  const toggleSound = () => {
    const isNowEnabled = sound.toggle();
    setSoundEnabled(isNowEnabled);
    showNotification("success", isNowEnabled ? "Sonido habilitado" : "Sonido silenciado");
  };

  const handleAuthModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authModalPin === "0000") {
      sound.playUnlock();
      setShowAuthModal(false);
      setAuthModalPin("");
      
      setIsJefeMode(true);
      setSessionRole("Jefe");
      localStorage.setItem("pos_session_role", "Jefe");
      showNotification("success", "Acceso autorizado como Administrador");
      
      if (authModalCallback) {
        authModalCallback();
        setAuthModalCallback(null);
      }
    } else {
      sound.playError();
      showNotification("error", "PIN de Administrador Incorrecto");
      setAuthModalPin("");
    }
  };

  const handleTabChange = (tab: "dashboard" | "pos" | "tareas" | "cierre" | "liquidaciones") => {
    setActiveTab(tab);
  };

  // --- Arqueo / Cierre State & Logic ---
  const [deliveredCash, setDeliveredCash] = useState<string>("");
  const [deliveredYape, setDeliveredYape] = useState<string>("");
  const [showCashBreakdown, setShowCashBreakdown] = useState<boolean>(false);
  const [cashCount, setCashCount] = useState<Record<string, string>>({});

  const updateCashCount = (den: number, val: string) => {
    setCashCount(prev => ({
      ...prev,
      [den.toString()]: val
    }));
  };

  const calculatedCashTotal = Object.entries(cashCount).reduce((acc, [denStr, qtyStr]) => {
    const den = parseFloat(denStr);
    const qty = parseInt(qtyStr) || 0;
    return acc + (den * qty);
  }, 0);

  const resetCashCount = () => {
    setCashCount({});
  };
  
  // Quick Gasto / Egreso States
  const [egresoMonto, setEgresoMonto] = useState<string>("");
  const [egresoDesc, setEgresoDesc] = useState<string>("");
  const [egresoMetodo, setEgresoMetodo] = useState<"Efectivo" | "Yape">("Efectivo");

  // Autofill states to sync with expected balances unless overriden manually
  const [prevExpectedEfectivo, setPrevExpectedEfectivo] = useState<number>(0);
  const [prevExpectedYape, setPrevExpectedYape] = useState<number>(0);

  useEffect(() => {
    if (cajaState.cierre.estado === "Abierto") {
      const currentEspCash = cajaState.resumenActual.esperadoEfectivo;
      const currentEspYape = cajaState.resumenActual.esperadoYape;
      
      const numCash = parseFloat(deliveredCash);
      const numYape = parseFloat(deliveredYape);

      if (
        deliveredCash === "" || 
        numCash === prevExpectedEfectivo || 
        isNaN(numCash)
      ) {
        setDeliveredCash(currentEspCash.toString());
      }
      
      if (
        deliveredYape === "" || 
        numYape === prevExpectedYape || 
        isNaN(numYape)
      ) {
        setDeliveredYape(currentEspYape.toString());
      }
      
      setPrevExpectedEfectivo(currentEspCash);
      setPrevExpectedYape(currentEspYape);
    } else {
      setDeliveredCash("");
      setDeliveredYape("");
    }
  }, [cajaState.resumenActual.esperadoEfectivo, cajaState.resumenActual.esperadoYape, cajaState.cierre.estado]);

  const handleEgresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(egresoMonto);
    if (isNaN(monto) || monto <= 0) {
      showNotification("error", "Por favor ingresa un monto válido de gasto");
      return;
    }
    if (!egresoDesc.trim()) {
      showNotification("error", "Por favor ingresa un concepto para el gasto");
      return;
    }

    startTransition(async () => {
      try {
        await registrarMovimiento({
          categoria: `Gasto: ${egresoDesc.trim()}`,
          tipo: "Egreso",
          monto_total: monto,
          ingreso_efectivo: egresoMetodo === "Efectivo" ? monto : 0,
          ingreso_yape: egresoMetodo === "Yape" ? monto : 0,
          salida_vuelto_efectivo: 0,
          salida_vuelto_yape: 0
        });
        showNotification("success", `Gasto de S/. ${monto.toFixed(2)} registrado y restado de caja.`);
        setEgresoMonto("");
        setEgresoDesc("");
        setShowQuickExpenseModal(false);
        await refreshAllData();
      } catch (err: any) {
        showNotification("error", err.message || "Error al registrar el egreso");
      }
    });
  };

  const handleAbrirNuevaCaja = async () => {
    const executeAbrirCaja = () => {
      startTransition(async () => {
        try {
          await abrirNuevaCaja();
          showNotification("success", "Nueva caja abierta con éxito para registrar más ventas.");
          setDeliveredCash("");
          setDeliveredYape("");
          setPrevExpectedEfectivo(0);
          setPrevExpectedYape(0);
          await refreshAllData();
        } catch (err: any) {
          showNotification("error", err.message || "Error al abrir la nueva caja");
        }
      });
    };

    setAuthModalPurpose("abrir un nuevo turno / reiniciar caja");
    setAuthModalCallback(() => executeAbrirCaja);
    setShowAuthModal(true);
  };

  const handleCierreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dCash = parseFloat(deliveredCash);
    const dYape = parseFloat(deliveredYape);

    if (isNaN(dCash) || isNaN(dYape) || dCash < 0 || dYape < 0) {
      showNotification("error", "Ingresa montos válidos entregados al jefe");
      return;
    }

    startTransition(async () => {
      try {
        await cerrarCajaDiaria({
          saldo_efectivo_entregado: dCash,
          saldo_yape_entregado: dYape
        });
        showNotification("success", "Caja cerrada y entregada con éxito. Turno bloqueado.");
        setDeliveredCash("");
        setDeliveredYape("");
        
        // Fetch closures history again to include the newly delivered closure
        const hist = await getHistorialCierres();
        setCierreHistory(hist);
        
        await refreshAllData();
      } catch (err: any) {
        showNotification("error", err.message || "Error al realizar el cierre");
      }
    });
  };

  // --- Liquidacion Monthly logic ---
  const handlePayMonth = async (mesAnio: string, bruto: number, pagoOp: number) => {
    const executePay = () => {
      startTransition(async () => {
        try {
          await guardarYMarcarLiquidacionComoPagada(mesAnio, bruto, pagoOp);
          showNotification("success", `Mes ${mesAnio} marcado como PAGADO correctamente.`);
          await refreshAllData();
        } catch (err: any) {
          showNotification("error", "Error al registrar pago");
        }
      });
    };

    setAuthModalPurpose("marcar la liquidación del mes como pagada");
    setAuthModalCallback(() => executePay);
    setShowAuthModal(true);
  };

  const handlePrintPastCierre = (cierre: any) => {
    setSelectedCierrePrint(cierre);
    setActivePrint("cierre");
  };

  // Quick filling tools for POS
  const fillPosQuick = (amount: number) => {
    setPosTotal(amount.toString());
  };

  // Colors for donut chart
  const COLORS = ["#10B981", "#8B5CF6", "#3B82F6"];

  return (
    <div className="flex flex-1 min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-purple-500 selection:text-white">
      
      {/* Sidebar Section */}
      <aside className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col justify-between hidden md:flex">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide bg-gradient-to-r from-purple-400 to-indigo-200 bg-clip-text text-transparent">
                SuperPOS
              </h1>
              <p className="text-xs text-slate-400 font-medium">Servicios Digitales</p>
            </div>
          </div>

          {/* User selector role status */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isJefeMode ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {isJefeMode ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Rol Activo</p>
                  <p className="text-xs font-bold text-slate-100">{isJefeMode ? "Administrador" : "Operador"}</p>
                </div>
              </div>
              
              {/* Audio and logout chimes */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSound}
                  className={`p-1.5 rounded border transition ${soundEnabled ? "bg-slate-850 hover:bg-slate-800 text-purple-400 border-slate-700" : "bg-slate-950 text-slate-500 border-slate-900"}`}
                  title={soundEnabled ? "Silenciar" : "Activar Sonido"}
                >
                  <Coffee className={`h-3.5 w-3.5 ${soundEnabled ? "animate-pulse" : ""}`} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 rounded border border-rose-500/20 transition active:scale-95"
                  title="Cerrar Sesión (Bloquear)"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!isJefeMode && (
              <button
                onClick={() => {
                  setAuthModalPurpose("cambiar a modo Administrador");
                  setAuthModalCallback(null);
                  setShowAuthModal(true);
                }}
                className="w-full text-[10px] font-black py-1.5 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg border border-purple-800/25 transition active:scale-95 shadow-md shadow-purple-950/20"
              >
                Autorizar Administrador (Jefe)
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => handleTabChange("pos")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === "pos"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Registrar Venta (POS)</span>
            </button>

            <button
              onClick={() => handleTabChange("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Dashboard de Ingresos</span>
            </button>

            <button
              onClick={() => handleTabChange("tareas")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === "tareas"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <div className="flex items-center justify-between w-full">
                <span>Tareas del Jefe</span>
                {tareas.filter(t => t.estado === "Pendiente").length > 0 && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-full font-mono">
                    {tareas.filter(t => t.estado === "Pendiente").length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabChange("cierre")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === "cierre"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Lock className="h-4 w-4" />
              <div className="flex items-center justify-between w-full">
                <span>Cierre de Caja</span>
                {cajaState.cierre.estado === "Entregado" ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded">Cerrado</span>
                ) : (
                  <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded">Abierto</span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabChange("liquidaciones")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === "liquidaciones"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Liquidación Mensual</span>
            </button>

            <button
              onClick={() => {
                if (!isJefeMode) {
                  setAuthModalPurpose("acceder a los Ajustes de Terminal");
                  setAuthModalCallback(() => setShowSettingsModal(true));
                  setShowAuthModal(true);
                } else {
                  setShowSettingsModal(true);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                showSettingsModal
                  ? "bg-gradient-to-r from-purple-650 to-indigo-650 text-white shadow-lg shadow-purple-550/15 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes de Terminal</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <Calendar className="h-3 w-3" />
              <span>Caja de Hoy</span>
            </div>
            <p className="text-sm font-bold text-slate-200">
              {mounted ? new Date().toLocaleDateString("es-PE", { dateStyle: "long" }) : ""}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
            <span>Versión 1.1</span>
            <button
              onClick={refreshAllData}
              className="flex items-center gap-1 hover:text-slate-300 transition"
              disabled={isPending}
            >
              <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-900 to-slate-950">
        
        {/* Top Navbar */}
        <header className="h-20 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-md bg-slate-950/30 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="md:hidden h-9 w-9 bg-purple-600 rounded-lg flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-extrabold text-sm sm:text-lg md:text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {activeTab === "pos" && "Punto de Venta / Registro"}
              {activeTab === "dashboard" && "Dashboard Financiero"}
              {activeTab === "tareas" && "Tablón de Tareas del Jefe"}
              {activeTab === "cierre" && "Auditoría de Cierre de Caja"}
              {activeTab === "liquidaciones" && "Liquidación del Operador (50%)"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick status dots for mobile and topbar */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${cajaState.cierre.estado === "Entregado" ? "bg-emerald-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
              <span>Caja: {cajaState.cierre.estado === "Entregado" ? "Cerrada/Entregada" : "Abierta para Ventas"}</span>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden items-center justify-center p-2.5 bg-slate-900 hover:bg-slate-855 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition active:scale-95 shadow-md shadow-slate-950/20"
              aria-label="Abrir Menú"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-purple-400" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
               onClick={handleLogout}
               className="sm:hidden p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 rounded-xl border border-rose-500/20 transition active:scale-95 shadow-md"
               title="Bloquear Terminal"
             >
               <Lock className="h-4 w-4" />
             </button>
            
            <button
              onClick={() => setIsJefeMode(!isJefeMode)}
              className={`sm:hidden px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                isJefeMode 
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300" 
                  : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
              }`}
            >
              {isJefeMode ? "Jefe" : "Operador"}
            </button>
          </div>
        </header>

        {/* Mobile Hamburger Drawer Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
            {/* Backdrop Blur overlay */}
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-out drawer menu content */}
            <div className="relative w-72 h-full bg-slate-905 border-l border-slate-850 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 bg-gradient-to-b from-slate-900 to-slate-950">
              
              <div className="space-y-6">
                {/* Header inside drawer */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 bg-purple-600 rounded flex items-center justify-center">
                      <Layers className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-100 tracking-wider uppercase">Navegación</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tabs selection list */}
                <nav className="space-y-2">
                  <button
                    onClick={() => {
                      handleTabChange("pos");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition duration-150 ${
                      activeTab === "pos"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>Punto de Venta / Registro</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange("dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition duration-150 ${
                      activeTab === "dashboard"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>Dashboard Financiero</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange("tareas");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition duration-150 ${
                      activeTab === "tareas"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span>Tareas del Jefe</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange("cierre");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition duration-150 ${
                      activeTab === "cierre"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>Arqueo y Cierre de Caja</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange("liquidaciones");
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition duration-150 ${
                      activeTab === "liquidaciones"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span>Liquidación de Sueldo (50%)</span>
                  </button>
                </nav>
              </div>

              {/* Bottom Footer inside mobile menu */}
              <div className="space-y-4 pt-6 border-t border-slate-850">
                {/* Jefe mode toggle for mobile */}
                <button
                  type="button"
                  onClick={() => setIsJefeMode(!isJefeMode)}
                  className={`w-full py-3 px-4 flex items-center justify-between rounded-xl font-bold text-xs border transition ${
                    isJefeMode
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Modo Administrador Jefe</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${isJefeMode ? "bg-amber-400 animate-pulse" : "bg-slate-700"}`} />
                </button>

                {/* Mobile Sync Button */}
                <button
                  type="button"
                  onClick={() => {
                    refreshAllData();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-slate-950/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                  disabled={isPending}
                >
                  <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
                  <span>Sincronizar Datos</span>
                </button>

                {/* Cache Status Badge */}
                <div className="flex items-center gap-2 justify-center py-1.5 px-3 bg-slate-950 rounded-lg text-[9px] text-slate-500 font-semibold border border-slate-850">
                  <span className={`h-2 w-2 rounded-full ${cajaState.cierre.estado === "Entregado" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                  <span>Caja: {cajaState.cierre.estado === "Entregado" ? "Cerrada y Entregada" : "Abierta para Ventas"}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Global Notification Banner */}
        {notif && (
          <div className="px-6 pt-6">
            <div className={`p-4 rounded-xl flex items-center gap-3 border ${
              notif.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            } animate-in fade-in slide-in-from-top-4 duration-300`}>
              {notif.type === "success" ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span className="text-sm font-semibold">{notif.text}</span>
            </div>
          </div>
        )}

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: POS / REGISTRO DE VENTAS */}
          {activeTab === "pos" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* POS Calculator & Form */}
              <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 space-y-6">
                
                {/* Status Bar */}
                {cajaState.cierre.estado === "Entregado" && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-300 text-sm font-bold">
                    <Lock className="h-5 w-5 shrink-0 animate-pulse" />
                    <span>Caja bloqueada. No se pueden registrar más movimientos hoy porque ya se entregó al jefe.</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-purple-500" />
                    <span className="font-bold text-slate-200">Nueva Operación</span>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Calculadora Financiera POS</span>
                </div>

                <form onSubmit={handlePOSSubmit} className="space-y-6">
                  
                  {/* Grid de Servicios Rápidos (Presets) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Servicios Frecuentes (Accesos Rápidos)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setPosCategory(preset.category);
                            setPosTotal(preset.price.toString());
                            if (preset.category === "Otros") {
                              setPosOtroDesc(preset.name);
                            } else {
                              setPosOtroDesc("");
                            }
                          }}
                          disabled={cajaState.cierre.estado === "Entregado"}
                          className="py-2.5 px-2 bg-slate-950/60 hover:bg-slate-900 active:bg-slate-950 border border-slate-850 hover:border-purple-550 rounded-xl flex flex-col items-center justify-center text-center transition hover:scale-[1.02] duration-150"
                        >
                          <span className="text-[11px] font-bold text-slate-200">{preset.name}</span>
                          <span className="text-[9px] text-purple-400 font-extrabold mt-0.5">S/. {preset.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Selection Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría del Servicio</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIAS.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPosCategory(cat)}
                          disabled={cajaState.cierre.estado === "Entregado"}
                          className={`py-3 px-2 text-center rounded-xl font-bold text-xs border transition duration-200 ${
                            posCategory === cat
                              ? "bg-purple-600/20 border-purple-500 text-purple-200"
                              : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Description Input if "Otros" is selected */}
                  {posCategory === "Otros" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Especificar Servicio (Otro)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Encuadernación, Plastificado, etc."
                        value={posOtroDesc}
                        onChange={(e) => setPosOtroDesc(e.target.value)}
                        disabled={cajaState.cierre.estado === "Entregado"}
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 rounded-xl py-3 px-4 text-slate-100 font-semibold focus:outline-none placeholder:text-slate-700 text-sm transition"
                        required={posCategory === "Otros"}
                      />
                    </div>
                  )}

                  {/* Pricing Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Monto del Servicio (S/.)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.00"
                          value={posTotal}
                          onChange={(e) => setPosTotal(e.target.value)}
                          disabled={cajaState.cierre.estado === "Entregado"}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 font-bold focus:outline-none focus:border-purple-500 placeholder:text-slate-700 text-lg transition"
                          required
                        />
                      </div>
                      
                      {/* Quick fill buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[0.5, 1, 2, 5, 10, 15, 20].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => fillPosQuick(amt)}
                            disabled={cajaState.cierre.estado === "Entregado"}
                            className="px-2.5 py-1 text-xs bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-400 rounded-lg font-semibold transition"
                          >
                            S/. {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Split Payments: Efectivo vs Yape */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Efectivo Recibido */}
                      <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                          Recibe en Efectivo (S/.)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-sm font-bold text-emerald-500">S/.</span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.00"
                            value={posCashReceived}
                            onChange={(e) => setPosCashReceived(e.target.value)}
                            disabled={cajaState.cierre.estado === "Entregado"}
                            className="w-full bg-slate-950/80 border border-emerald-500/20 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-4 text-emerald-300 font-bold focus:outline-none placeholder:text-emerald-950 transition"
                          />
                        </div>
                        {/* Quick received cash shortcuts */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPosCashReceived(posTotal);
                              setPosYapeReceived("");
                            }}
                            disabled={!posTotal || cajaState.cierre.estado === "Entregado"}
                            className="px-2 py-1 text-[9px] bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 rounded border border-emerald-500/20 font-black transition active:scale-95 animate-in fade-in duration-255"
                          >
                            Exacto Efe.
                          </button>
                          {[5, 10, 20, 50, 100].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => {
                                setPosCashReceived(bill.toString());
                                setPosYapeReceived("");
                              }}
                              disabled={cajaState.cierre.estado === "Entregado" || parseFloat(posTotal || "0") > bill}
                              className="px-1.5 py-1 text-[9px] bg-slate-950/40 hover:bg-emerald-955 text-emerald-400 rounded border border-slate-800 hover:border-emerald-500/20 transition active:scale-95"
                            >
                              S/. {bill}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Yape Recibido */}
                      <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/10">
                        <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                          Recibe en Yape (S/.)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-sm font-bold text-purple-500">S/.</span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.00"
                            value={posYapeReceived}
                            onChange={(e) => setPosYapeReceived(e.target.value)}
                            disabled={cajaState.cierre.estado === "Entregado"}
                            className="w-full bg-slate-950/80 border border-purple-500/20 focus:border-purple-500 rounded-xl py-2.5 pl-9 pr-4 text-purple-300 font-bold focus:outline-none placeholder:text-purple-950 transition"
                          />
                        </div>
                        {/* Quick received yape shortcuts */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPosYapeReceived(posTotal);
                              setPosCashReceived("");
                            }}
                            disabled={!posTotal || cajaState.cierre.estado === "Entregado"}
                            className="px-2.5 py-1 text-[9px] bg-purple-950/30 hover:bg-purple-900/40 text-purple-400 rounded border border-purple-500/20 font-black transition active:scale-95 animate-in fade-in duration-255"
                          >
                            Exacto Yape
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calculations & Change Box */}
                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-400">
                      <span>Total Recibido:</span>
                      <span className="text-slate-200">S/. {totalReceived.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold text-slate-400">
                      <span>Monto del Servicio:</span>
                      <span className="text-slate-200">S/. {(parseFloat(posTotal) || 0).toFixed(2)}</span>
                    </div>

                    <div className="border-t border-slate-800 my-2 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-300">Vuelto / Cambio a entregar:</span>
                      <span className={`text-xl font-extrabold ${changeRequired ? "text-amber-400" : "text-slate-500"}`}>
                        S/. {changeValue.toFixed(2)}
                      </span>
                    </div>

                    {/* Exige seleccionar por donde se entrega el vuelto */}
                    {changeRequired && (
                      <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 space-y-3">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          ⚠️ Método de entrega de Vuelto (Obligatorio)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPosChangeTarget("Efectivo")}
                            className={`py-2 rounded-lg font-bold text-xs border transition ${
                              posChangeTarget === "Efectivo"
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                : "bg-slate-950 border-slate-800 text-slate-500"
                            }`}
                          >
                            Entregar Efectivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosChangeTarget("Yape")}
                            className={`py-2 rounded-lg font-bold text-xs border transition ${
                              posChangeTarget === "Yape"
                                ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                : "bg-slate-950 border-slate-800 text-slate-500"
                            }`}
                          >
                            Entregar por Yape
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission */}
                  <button
                    type="submit"
                    disabled={cajaState.cierre.estado === "Entregado" || isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isPending ? "Procesando..." : "Registrar Operación e Inyectar en Caja"}
                  </button>

                </form>
              </div>

              {/* Side Summary list of current day operations */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Expected Box balance widget */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo de Turno Acumulado</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <p className="text-xs font-semibold text-emerald-400 mb-1">Efectivo en Caja</p>
                      <p className="text-xl font-black text-slate-100">
                        S/. {cajaState.resumenActual.esperadoEfectivo.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <p className="text-xs font-semibold text-purple-400 mb-1">Yape Recibido</p>
                      <p className="text-xl font-black text-slate-100">
                        S/. {cajaState.resumenActual.esperadoYape.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-purple-900/10 p-3 rounded-xl border border-purple-500/10 flex justify-between items-center text-xs font-bold text-purple-300">
                    <span>Suma Bruta del Día:</span>
                    <span>S/. {cajaState.resumenActual.totalEsperado.toFixed(2)}</span>
                  </div>

                  {cajaState.cierre.estado === "Abierto" && (
                    <button
                      type="button"
                      onClick={() => setShowQuickExpenseModal(true)}
                      className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-450 hover:text-rose-350 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-rose-950/20"
                    >
                      <ArrowDownRight className="h-4.5 w-4.5" />
                      <span>Registrar Gasto Operativo (Egreso)</span>
                    </button>
                  )}
                </div>

                {/* History of filtered movements */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 space-y-4 flex-1 w-full min-w-0">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 gap-2 flex-wrap">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Visualización de Movimientos</span>
                      <span className="text-[10px] text-slate-550 font-bold bg-slate-950 px-2.5 py-0.5 rounded">
                        {movimientos.length} {movimientos.length === 1 ? "operación" : "operaciones"}
                      </span>
                    </div>

                    {/* Filter Segmented Control tabs */}
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 self-end">
                      <button
                        type="button"
                        onClick={() => setRangoMovimientos("hoy")}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-md transition ${
                          rangoMovimientos === "hoy"
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/10"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Día
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangoMovimientos("semana")}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-md transition ${
                          rangoMovimientos === "semana"
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/10"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Semana
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangoMovimientos("mes")}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-md transition ${
                          rangoMovimientos === "mes"
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/10"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Mes
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {movimientos.length === 0 ? (
                      <div className="text-center py-10 text-slate-650">
                        <Coffee className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                        <p className="text-xs font-bold">No hay movimientos en este rango</p>
                      </div>
                    ) : (
                      movimientos.map((mov) => {
                        const effectiveCash = mov.ingreso_efoc_change_net || (mov.ingreso_efectivo - mov.salida_vuelto_efectivo);
                        const effectiveYape = mov.ingreso_yape_change_net || (mov.ingreso_yape - mov.salida_vuelto_yape);
                        
                        // Helper to format movement timestamp dynamically based on date relevance
                        const formatMovTimestamp = () => {
                          if (!mounted) return "";
                          const dateObj = new Date(mov.fecha);
                          const isToday = new Date().toDateString() === dateObj.toDateString();
                          if (isToday) {
                            return dateObj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
                          } else {
                            return `${dateObj.toLocaleDateString("es-PE", { day: "numeric", month: "short" })} • ${dateObj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
                          }
                        };

                        return (
                          <div key={mov.id} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 flex justify-between items-start gap-3 hover:border-slate-800 transition w-full min-w-0">
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-200 break-words leading-tight">{mov.categoria}</p>
                              <div className="flex gap-2 text-[10px] font-semibold text-slate-500 flex-wrap">
                                <span>{formatMovTimestamp()}</span>
                                <span>•</span>
                                <span className="text-slate-400">
                                  {mov.ingreso_efectivo > 0 && `Efe: S/. ${mov.ingreso_efectivo}`}
                                  {mov.ingreso_yape > 0 && ` Yape: S/. ${mov.ingreso_yape}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-200">S/. {mov.monto_total.toFixed(2)}</p>
                              {mov.salida_vuelto_efectivo + mov.salida_vuelto_yape > 0 && (
                                <p className="text-[9px] text-amber-500 font-bold">
                                  Vuelto: S/. {(mov.salida_vuelto_efectivo + mov.salida_vuelto_yape).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: DASHBOARD FINANCIERO */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Top Monthly Summary Widget Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1 */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingreso Bruto Mensual</p>
                    <p className="text-3xl font-black text-slate-100">
                      S/. {dashboardState.resumenMensual.ingresoBruto.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Consolidado ventas + cotizaciones</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                {/* 2 */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comisión Operador (50%)</p>
                    <p className="text-3xl font-black text-emerald-400">
                      S/. {dashboardState.resumenMensual.pagoOperador.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Liquidación estimada acumulada</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>

                {/* 3 */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo Mes</p>
                    <p className="text-2xl font-black text-slate-200">
                      S/. {dashboardState.resumenMensual.totalEfectivo.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Neto recibido en físico</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <Coins className="h-5 w-5" />
                  </div>
                </div>

                {/* 4 */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yape Recibido Mes</p>
                    <p className="text-2xl font-black text-slate-200">
                      S/. {dashboardState.resumenMensual.totalYape.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Flujo digital transferido</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>

              </div>

              {/* Graphic Layout Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 7 Days Sales Trend Chart */}
                <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Historial de Ingresos Diarios (Últimos 7 días)</h3>
                    <span className="text-xs text-slate-500 font-semibold">Tendencia diaria</span>
                  </div>

                  <div className="h-80 w-full">
                    {dashboardState.chartSalesData.length === 0 ? (
                      <div className="h-full flex flex-col justify-center items-center text-slate-600">
                        <TrendingUp className="h-10 w-10 text-slate-700 mb-2" />
                        <p className="text-xs font-bold">No hay cierres previos registrados para graficar</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dashboardState.chartSalesData}
                          margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", color: "#F8FAFC", borderRadius: "12px" }}
                            labelStyle={{ fontWeight: "bold" }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                          <Bar dataKey="Efectivo" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Yape" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Donut distribution Yape vs Cash vs Boss Tasks */}
                <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Métodos de Cobro</h3>
                    <span className="text-xs text-slate-500 font-semibold">Mes actual</span>
                  </div>

                  <div className="h-64 w-full flex justify-center items-center relative">
                    {dashboardState.resumenMensual.ingresoBruto === 0 ? (
                      <div className="text-center text-slate-600">
                        <p className="text-xs font-bold">Aún sin registros para graficar</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardState.distribucionMetodos.filter((item: any) => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {dashboardState.distribucionMetodos.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", color: "#F8FAFC", borderRadius: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {/* Centered balance summary */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black">Bruto</span>
                      <span className="text-md font-extrabold text-slate-200">
                        S/. {dashboardState.resumenMensual.ingresoBruto.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Manual legends */}
                  <div className="space-y-2 pt-2">
                    {dashboardState.distribucionMetodos.map((item: any, i: number) => (
                      <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-slate-200 font-extrabold">
                          S/. {item.value.toFixed(2)} (
                          {dashboardState.resumenMensual.ingresoBruto > 0 
                            ? ((item.value / dashboardState.resumenMensual.ingresoBruto) * 100).toFixed(0) 
                            : 0}% )
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Category Performance Breakdown Row */}
              <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 gap-2 flex-wrap">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Rendimiento por Categoría de Servicio</h3>
                    <p className="text-xs text-slate-500 font-semibold">Análisis de rentabilidad por línea de negocio del mes en curso</p>
                  </div>
                  <span className="text-xs text-slate-400 font-bold bg-slate-950 px-3 py-1 rounded">
                    Mes Actual
                  </span>
                </div>

                {!dashboardState.rendimientoCategorias || dashboardState.rendimientoCategorias.length === 0 ? (
                  <div className="text-center py-6 text-slate-650">
                    <Coffee className="h-6 w-6 mx-auto mb-1 text-slate-755 animate-pulse" />
                    <p className="text-xs font-bold">No hay transacciones registradas este mes para analizar</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dashboardState.rendimientoCategorias.map((item: any, i: number) => {
                      const maxVal = Math.max(...dashboardState.rendimientoCategorias.map((x: any) => x.value), 1);
                      const pctWidth = ((item.value / maxVal) * 100).toFixed(0);
                      const pctOfTotal = dashboardState.resumenMensual.ingresoBruto > 0
                        ? ((item.value / dashboardState.resumenMensual.ingresoBruto) * 100).toFixed(0)
                        : "0";
                      
                      const HSL_COLORS = [
                        "from-purple-650 to-indigo-655",
                        "from-emerald-600 to-teal-605",
                        "from-blue-600 to-cyan-605",
                        "from-amber-600 to-orange-605",
                        "from-rose-600 to-pink-605",
                        "from-violet-600 to-fuchsia-605"
                      ];
                      
                      const barGradient = HSL_COLORS[i % HSL_COLORS.length];

                      return (
                        <div key={item.name} className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-300 font-black">{item.name}</span>
                            <span className="text-slate-100 font-extrabold">
                              S/. {item.value.toFixed(2)}{" "}
                              <span className="text-slate-500 font-bold">({pctOfTotal}%)</span>
                            </span>
                          </div>
                          
                          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              style={{ width: `${pctWidth}%` }}
                              className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: TAREAS DEL JEFE */}
          {activeTab === "tareas" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Form to submit a new boss's task (operator) */}
              <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Plus className="h-5 w-5 text-purple-400" />
                  <h3 className="font-bold text-slate-200 text-sm">Registrar Solicitud del Jefe</h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Registra tareas encargadas directamente por el jefe que aún no tienen cotización. Inicialmente se guardan como <strong>Pendiente de Precio</strong> y no afectarán la caja diaria hasta ser cotizadas.
                </p>

                <form onSubmit={handleCreateJefeTask} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción del Trabajo</label>
                    <textarea
                      placeholder="Ej. 'Hacer 50 flyers para mañana', 'Edición de video corporativo'"
                      value={jefeDesc}
                      onChange={(e) => setJefeDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-slate-100 font-semibold focus:outline-none placeholder:text-slate-700 text-xs transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold py-3 rounded-xl border border-slate-750 transition active:scale-[0.98]"
                  >
                    {isPending ? "Registrando..." : "Crear Tarea del Jefe"}
                  </button>
                </form>
              </div>

              {/* Kanban / Tablon board */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Toggle warning for Boss Role */}
                {!isJefeMode && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between text-xs font-semibold text-amber-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Solo el rol del <strong>Jefe (Admin)</strong> puede establecer precios y cotizar estas tareas.</span>
                    </div>
                    <button
                      onClick={() => setIsJefeMode(true)}
                      className="underline hover:text-amber-200 text-[11px] font-bold"
                    >
                      Simular Jefe
                    </button>
                  </div>
                )}

                {/* List container */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Trabajos Especiales</h3>
                    <span className="text-xs font-bold bg-slate-950 px-2 py-0.5 rounded text-slate-400">
                      {tareas.length} totales
                    </span>
                  </div>

                  <div className="space-y-3">
                    {tareas.length === 0 ? (
                      <div className="text-center py-12 text-slate-600">
                        <Briefcase className="h-10 w-10 mx-auto mb-2 text-slate-700" />
                        <p className="text-xs font-bold">No hay tareas especiales del jefe registradas</p>
                      </div>
                    ) : (
                      tareas.map((task) => (
                        <div
                          key={task.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition duration-300 ${
                            task.estado === "Cotizado"
                              ? "bg-slate-950/20 border-slate-850 opacity-75"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                task.estado === "Cotizado"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}>
                                {task.estado === "Cotizado" ? "Cotizado (Inyectado)" : "Pendiente de Precio"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {mounted ? new Date(task.fecha_solicitud).toLocaleDateString("es-PE") : ""}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-200 leading-normal">{task.descripcion}</p>
                          </div>

                          <div className="shrink-0 flex items-center gap-3">
                            {task.estado === "Cotizado" ? (
                              <div className="text-right">
                                <span className="text-xs font-bold text-slate-500 block">Cotizado por:</span>
                                <span className="text-md font-extrabold text-slate-200">S/. {task.precio_final?.toFixed(2)}</span>
                              </div>
                            ) : (
                              // Quote action for Boss
                              <div className="flex items-center gap-2">
                                <div className="relative w-24">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <span className="text-[10px] font-bold text-slate-600">S/.</span>
                                  </div>
                                  <input
                                    type="number"
                                    placeholder="Precio"
                                    value={quotePrices[task.id] || ""}
                                    onChange={(e) => setQuotePrices(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    disabled={!isJefeMode}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-amber-300 focus:outline-none placeholder:text-slate-700 disabled:opacity-40"
                                  />
                                </div>
                                <select
                                  value={quoteMethods[task.id] || "Yape"}
                                  onChange={(e) => setQuoteMethods(prev => ({ ...prev, [task.id]: e.target.value as "Efectivo" | "Yape" }))}
                                  disabled={!isJefeMode}
                                  className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg p-1.5 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                                >
                                  <option value="Yape">Yape</option>
                                  <option value="Efectivo">Efectivo</option>
                                </select>
                                <button
                                  onClick={() => handleQuoteTask(task.id)}
                                  disabled={!isJefeMode || isPending}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-black text-xs rounded-lg transition active:scale-95 disabled:text-slate-600"
                                >
                                  Cotizar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: CIERRE DE CAJA */}
          {activeTab === "cierre" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Blind Arqueo & Closure Form */}
              <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-6">
                
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Lock className="h-5 w-5 text-rose-400" />
                  <h3 className="font-bold text-slate-200 text-sm">Rendición Diaria de Caja</h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Realiza el <strong>arqueo ciego</strong> del turno. Ingresa la cantidad exacta que estás entregando físicamente en efectivo y el monto final de transferencias en Yape. Al procesar el cierre, el sistema guardará el registro y **bloqueará permanentemente** la edición de ventas para esta fecha.
                </p>

                {cajaState.cierre.estado === "Entregado" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-3">
                    <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
                    <h4 className="font-black text-emerald-300 text-sm">Caja Cerrada y Entregada</h4>
                    <p className="text-[11px] text-slate-400">
                      Entregado al Jefe: <br />
                      <strong>Efectivo:</strong> S/. {cajaState.cierre.saldo_efectivo_entregado.toFixed(2)} <br />
                      <strong>Yape:</strong> S/. {cajaState.cierre.saldo_yape_entregado.toFixed(2)}
                    </p>
                    <div className="text-[10px] text-slate-500 font-semibold pt-1 pb-1">
                      Fecha: {mounted ? new Date(cajaState.cierre.fecha).toLocaleString("es-PE") : ""}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActivePrint("cierre")}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-purple-500/10 transition active:scale-95"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Imprimir Ticket de Cierre (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAbrirNuevaCaja}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition active:scale-95 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isPending ? "Abriendo..." : "Abrir Nueva Caja / Turno"}</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCierreSubmit} className="space-y-4">
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black">Resumen del Estado Interno</span>
                      <p className="text-xs text-slate-400">
                        Una vez guardado, el operador ya no podrá ingresar servicios para hoy. Los montos se han autocompletado con los calculados por el sistema para tu comodidad.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Monto Efectivo Entregado (S/.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={deliveredCash}
                          onChange={(e) => setDeliveredCash(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-4 text-slate-100 font-bold focus:outline-none placeholder:text-slate-800 text-sm transition"
                          required
                        />

                        {/* Interactive Bill & Coin breakdown tool */}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowCashBreakdown(!showCashBreakdown)}
                            className="w-full py-2 px-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-400 text-xs font-bold rounded-xl transition flex items-center justify-between"
                          >
                            <span>🧮 Calculadora Desglose de Efectivo</span>
                            <span className="text-[10px] text-purple-400 font-black">
                              {showCashBreakdown ? "Ocultar" : "Mostrar"}
                            </span>
                          </button>
                          
                          {showCashBreakdown && (
                            <div className="mt-2.5 p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="border-b border-slate-800 pb-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Conteo de Billetes y Monedas</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {/* Bills Column */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-center">Billetes (S/.)</p>
                                  {[200, 100, 50, 20, 10].map((den) => (
                                    <div key={den} className="flex items-center justify-between gap-1">
                                      <span className="text-[10px] font-bold text-slate-450 w-12">S/. {den}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={cashCount[den.toString()] || ""}
                                        onChange={(e) => updateCashCount(den, e.target.value)}
                                        className="w-16 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 font-bold text-xs text-center focus:outline-none focus:border-purple-550 transition"
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Coins Column */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-center">Monedas (S/.)</p>
                                  {[5, 2, 1, 0.50, 0.20, 0.10].map((den) => (
                                    <div key={den} className="flex items-center justify-between gap-1">
                                      <span className="text-[10px] font-bold text-slate-455 w-12">S/. {den.toFixed(2)}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={cashCount[den.toString()] || ""}
                                        onChange={(e) => updateCashCount(den, e.target.value)}
                                        className="w-16 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 font-bold text-xs text-center focus:outline-none focus:border-purple-550 transition"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Total calculated & transfer button */}
                              <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2 flex-wrap">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-550 font-bold block uppercase">Conteo Total:</span>
                                  <strong className="text-xs font-black text-emerald-400">S/. {calculatedCashTotal.toFixed(2)}</strong>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={resetCashCount}
                                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition"
                                  >
                                    Limpiar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeliveredCash(calculatedCashTotal.toFixed(2));
                                      showNotification("success", `Efectivo de Cierre actualizado a S/. ${calculatedCashTotal.toFixed(2)}`);
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white rounded-lg transition"
                                  >
                                    Usar Total
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Monto Yape Entregado (S/.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={deliveredYape}
                          onChange={(e) => setDeliveredYape(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-4 text-slate-100 font-bold focus:outline-none placeholder:text-slate-800 text-sm transition"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-rose-500/10 transition active:scale-[0.98] disabled:opacity-50 text-sm"
                    >
                      {isPending ? "Cerrando..." : "Cerrar Turno y Entregar al Jefe"}
                    </button>

                  </form>
                )}

              </div>

              {/* Internal expectation vs delivered report (Simulates Jefe view) */}
              <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporte de Auditoría e Ingresos</h3>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-500 font-black">
                    Modo Auditoría
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-normal mb-2">
                  Monitorea los ingresos del turno actual en tiempo real o audita los descuadres después del cierre de caja.
                </p>

                {cajaState.cierre.estado === "Abierto" ? (
                  <div className="space-y-6">
                    
                    {/* Live system expectation balances */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                      <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">Esperado en Sistema en Tiempo Real</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase">Efectivo Físico</span>
                          <strong className="text-sm font-black text-slate-200">S/. {cajaState.resumenActual.esperadoEfectivo.toFixed(2)}</strong>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase">Yape / QR</span>
                          <strong className="text-sm font-black text-slate-200">S/. {cajaState.resumenActual.esperadoYape.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Total en Caja Estimado:</span>
                        <strong className="text-sm font-black text-rose-400">S/. {cajaState.resumenActual.totalEsperado.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Quick Expense/Egreso register form */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-850 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                        <Coins className="h-4 w-4 text-rose-500 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Registrar Gasto / Egreso Rápido</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        ¿Hubo gastos de suministros o retiros del cajón? Registra el egreso para restar del esperado del sistema de inmediato.
                      </p>
                      
                      <form onSubmit={handleEgresoSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Monto (S/.)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={egresoMonto}
                            onChange={(e) => setEgresoMonto(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-200 font-bold focus:outline-none text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción / Concepto</label>
                          <input
                            type="text"
                            placeholder="Ej: Almuerzo, Internet"
                            value={egresoDesc}
                            onChange={(e) => setEgresoDesc(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Medio de Pago</label>
                          <select
                            value={egresoMetodo}
                            onChange={(e) => setEgresoMetodo(e.target.value as "Efectivo" | "Yape")}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-200 font-bold focus:outline-none text-xs"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Yape">Yape</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3 pt-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-650 text-white font-extrabold py-2 px-4 rounded-xl text-xs shadow-lg shadow-rose-900/10 transition active:scale-[0.98] disabled:opacity-50"
                          >
                            {isPending ? "Registrando..." : "Registrar Salida / Gasto de Caja"}
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    
                    <div className="grid grid-cols-3 gap-4 font-bold text-xs text-slate-400 border-b border-slate-850 pb-2">
                      <span>Concepto</span>
                      <span className="text-right">Sistema (Esperado)</span>
                      <span className="text-right">Entregado (Operador)</span>
                    </div>

                    {/* Efectivo Row */}
                    <div className="grid grid-cols-3 items-center text-xs py-1">
                      <span className="font-semibold text-slate-300">Efectivo Físico</span>
                      <span className="text-right font-semibold text-slate-400">
                        S/. {cajaState.resumenActual.esperadoEfectivo.toFixed(2)}
                      </span>
                      <span className="text-right font-extrabold text-slate-200">
                        S/. {cajaState.cierre.saldo_efectivo_entregado.toFixed(2)}
                      </span>
                    </div>

                    {/* Yape Row */}
                    <div className="grid grid-cols-3 items-center text-xs py-1">
                      <span className="font-semibold text-slate-300">Yape / QR</span>
                      <span className="text-right font-semibold text-slate-400">
                        S/. {cajaState.resumenActual.esperadoYape.toFixed(2)}
                      </span>
                      <span className="text-right font-extrabold text-slate-200">
                        S/. {cajaState.cierre.saldo_yape_entregado.toFixed(2)}
                      </span>
                    </div>

                    {/* Totales */}
                    <div className="grid grid-cols-3 items-center text-xs font-bold border-t border-slate-850 pt-3">
                      <span className="text-slate-200">Monto Total</span>
                      <span className="text-right text-slate-300">
                        S/. {cajaState.resumenActual.totalEsperado.toFixed(2)}
                      </span>
                      <span className="text-right text-slate-200">
                        S/. {(cajaState.cierre.saldo_efectivo_entregado + cajaState.cierre.saldo_yape_entregado).toFixed(2)}
                      </span>
                    </div>

                    {/* Diferencia calculator box */}
                    {(() => {
                      const totalEsp = cajaState.resumenActual.totalEsperado;
                      const totalEnt = cajaState.cierre.saldo_efectivo_entregado + cajaState.cierre.saldo_yape_entregado;
                      const diff = totalEnt - totalEsp;
                      const diffAbs = Math.abs(diff);

                      return (
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          diff === 0 
                            ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                            : diff > 0 
                              ? "bg-indigo-500/5 border-indigo-500/10 text-indigo-400"
                              : "bg-rose-500/5 border-rose-500/10 text-rose-400"
                        }`}>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase">Resultado Cuadre de Caja</span>
                            <p className="text-xs font-semibold">
                              {diff === 0 && "Caja Perfecta. No hay diferencias."}
                              {diff > 0 && "Caja con Sobrante."}
                              {diff < 0 && "Caja con Faltante."}
                            </p>
                          </div>
                          <span className="text-lg font-black">
                            {diff > 0 ? "+" : diff < 0 ? "-" : ""} S/. {diffAbs.toFixed(2)}
                          </span>
                        </div>
                      );
                    })()}

                  </div>
                )}

              </div>

              {/* PAST CLOSURES HISTORY LIST & PRINT ADVICE */}
              <div className="lg:col-span-12 w-full space-y-6 mt-6">
                {/* Print Tip Banner */}
                <div className="bg-purple-950/10 border border-purple-500/15 p-4.5 rounded-2xl flex items-start gap-3">
                  <Coffee className="h-5 w-5 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-200">💡 Consejos para Impresión de Ticket Térmico</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Para obtener un corte limpio de 80mm en su ticketera física al imprimir el arqueo de caja, asegúrese de desmarcar <strong className="text-slate-200 font-extrabold">"Cabeceras y pies de página"</strong> y configurar los márgenes como <strong className="text-slate-200 font-extrabold">"Ninguno"</strong> en el cuadro de diálogo de impresión del navegador.
                    </p>
                  </div>
                </div>

                {/* Past Closures History Card */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 gap-2 flex-wrap">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Turnos de Caja Pasados</h3>
                      <p className="text-[10px] text-slate-500 font-semibold">Revisa y re-imprime arqueos de caja anteriores</p>
                    </div>
                    <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded text-slate-400 font-bold font-mono">
                      {cierreHistory.length} cierres registrados
                    </span>
                  </div>

                  {cierreHistory.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800/80 p-6">
                      <Coffee className="h-10 w-10 mx-auto mb-3 text-slate-700 animate-bounce" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No hay cierres de caja en el historial</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                      {cierreHistory.map((c: any) => {
                        const totalEntregado = c.saldo_efectivo_entregado + c.saldo_yape_entregado;
                        return (
                          <div
                            key={c.id}
                            className="group relative bg-gradient-to-br from-slate-900/60 to-slate-950/80 hover:from-slate-900/80 hover:to-slate-950 border border-slate-800 hover:border-purple-550/40 p-5 rounded-2xl shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                          >
                            {/* Glass hover aura */}
                            <div className="absolute -right-16 -top-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
                            
                            <div>
                              {/* Header: Date and Badge */}
                              <div className="flex items-center justify-between border-b border-slate-850/80 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-purple-400 shrink-0" />
                                  <span className="text-xs font-black text-slate-300 font-mono tracking-wide">
                                    {formatLocalDate(c.fecha)}
                                  </span>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-sm">
                                  Entregado
                                </span>
                              </div>

                              {/* Cash & Yape Breakdowns */}
                              <div className="space-y-3 mb-5">
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                                    <Coins className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Efectivo Físico</span>
                                  </div>
                                  <strong className="font-mono text-slate-200 font-extrabold text-xs">
                                    {formatCurrency(c.saldo_efectivo_entregado)}
                                  </strong>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                                    <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Yape / QR</span>
                                  </div>
                                  <strong className="font-mono text-slate-200 font-extrabold text-xs">
                                    {formatCurrency(c.saldo_yape_entregado)}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Separator Voucher Line */}
                            <div className="border-t border-dashed border-slate-800/80 my-3.5 pt-4 flex flex-col gap-3">
                              {/* Grand Total */}
                              <div className="flex justify-between items-end">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Total Entregado</span>
                                <span className="font-mono text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                                  {formatCurrency(totalEntregado)}
                                </span>
                              </div>

                              {/* Actions Button */}
                              <button
                                type="button"
                                onClick={() => handlePrintPastCierre(c)}
                                className="w-full mt-1.5 py-2.5 bg-slate-950/60 hover:bg-purple-600 border border-slate-800 hover:border-purple-500 text-slate-350 hover:text-white font-extrabold rounded-xl transition-all duration-200 active:scale-[0.97] text-[10px] flex items-center justify-center gap-2 tracking-wider uppercase"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Re-imprimir Ticket</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: LIQUIDACION MENSUAL */}
          {activeTab === "liquidaciones" && (
            <div className="space-y-6">
              
              {/* Highlight Month estimations */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Live estimation banner */}
                <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-6">
                  
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="font-bold text-slate-200 text-sm">Mes en Curso (Live Estimation)</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {liquidaciones.actualEstimada ? liquidaciones.actualEstimada.mes_anio : "Mes registrado"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    A continuación se consolidan los ingresos acumulados en el mes actual. La comisión equivale exactamente al <strong>50% del total</strong> de ingresos brutos. Al presionar "Marcar Mes como Pagado", se congelará y archivará en el historial.
                  </p>

                  {liquidaciones.actualEstimada ? (
                    <div className="space-y-6">
                      
                      {/* Breakdown lists */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                          <span>Ventas Netas (Efectivo + Yape):</span>
                          <span className="text-slate-200">
                            S/. {(dashboardState.resumenMensual.totalEfectivo + dashboardState.resumenMensual.totalYape).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                          <span>Tareas del Jefe Cotizadas:</span>
                          <span className="text-slate-200">
                            S/. {dashboardState.resumenMensual.totalTareas.toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-slate-850 my-1 pt-2 flex justify-between items-center text-xs font-bold text-slate-300">
                          <span>Ingreso Bruto Total:</span>
                          <span>S/. {liquidaciones.actualEstimada.ingreso_bruto_total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Card banner */}
                      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 p-6 rounded-2xl border border-purple-500/20 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-purple-300 font-black uppercase tracking-widest">
                            Monto a Pagar al Operador (50%)
                          </span>
                          <h4 className="text-3xl font-black text-slate-100">
                            S/. {liquidaciones.actualEstimada.pago_operador.toFixed(2)}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Cálculo de liquidación de sueldo del operador</p>
                        </div>

                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLiquidacionPrint({
                                mes_anio: liquidaciones.actualEstimada.mes_anio,
                                ingreso_bruto_total: liquidaciones.actualEstimada.ingreso_bruto_total,
                                pago_operador: liquidaciones.actualEstimada.pago_operador,
                                estado_pago: "Estimado (En Curso)",
                                ventas: (dashboardState.resumenMensual.totalEfectivo + dashboardState.resumenMensual.totalYape),
                                tareas: dashboardState.resumenMensual.totalTareas
                              });
                              setActivePrint("liquidacion");
                            }}
                            className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Imprimir Voucher</span>
                          </button>

                          <button
                            onClick={() => handlePayMonth(
                              liquidaciones.actualEstimada!.mes_anio,
                              liquidaciones.actualEstimada!.ingreso_bruto_total,
                              liquidaciones.actualEstimada!.pago_operador
                            )}
                            disabled={liquidaciones.actualEstimada.ingreso_bruto_total === 0 || isPending}
                            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 shrink-0"
                          >
                            Marcar Mes como Pagado
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-2">
                      <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-200">La liquidación de este mes ya fue procesada e históricamente guardada.</p>
                    </div>
                  )}

                </div>

                {/* Right History lists */}
                <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
                  
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Liquidaciones</h3>
                    <span className="text-xs font-semibold text-slate-500">Ciclos archivados</span>
                  </div>

                  <div className="space-y-3">
                    {liquidaciones.registradas.length === 0 ? (
                      <div className="text-center py-12 text-slate-600">
                        <FileText className="h-10 w-10 mx-auto mb-2 text-slate-700" />
                        <p className="text-xs font-bold">No hay liquidaciones archivadas en la base de datos</p>
                      </div>
                    ) : (
                      liquidaciones.registradas.map((liq: any) => (
                        <div key={liq.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-855 flex justify-between items-center gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-200">{liq.mes_anio}</span>
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">
                                {liq.estado_pago}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              Ingreso Bruto: S/. {liq.ingreso_bruto_total.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block font-semibold">Operador Pagado:</span>
                              <span className="text-sm font-black text-emerald-400">S/. {liq.pago_operador.toFixed(2)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLiquidacionPrint({
                                  mes_anio: liq.mes_anio,
                                  ingreso_bruto_total: liq.ingreso_bruto_total,
                                  pago_operador: liq.pago_operador,
                                  estado_pago: liq.estado_pago,
                                  ventas: liq.ingreso_bruto_total, // consolidate under sales since it's already closed
                                  tareas: 0
                                });
                                setActivePrint("liquidacion");
                              }}
                              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-lg transition"
                              title="Imprimir Recibo"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* SECTION TO PRINT: NATIVE BROWSER VECTOR PDF ENGINE */}
      {activePrint && (
        <div id="print-section" className="hidden print:block bg-white text-black p-8 font-mono text-sm leading-relaxed max-w-[800px] mx-auto">
          
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
                background: white !important;
                color: black !important;
              }
              #print-section, #print-section * {
                visibility: visible !important;
              }
              #print-section {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
              }
              @page {
                margin: 0.5cm;
              }
            }
          `}} />

          {/* TEMPLATE A: DAILY CLOSURE TICKET (THERMAL POS TICKET REDESIGN) */}
          {activePrint === "cierre" && (
            <div className="max-w-[310px] mx-auto border-t-4 border-b-4 border-slate-400 border-dotted p-5 bg-white text-black font-mono shadow-sm relative text-xs">
              
              {/* Retro Pixel logo cup mockup */}
              <div className="text-center space-y-1 mb-4 select-none">
                <pre className="text-[7px] leading-tight font-bold text-gray-800 inline-block font-mono">
{`   ( (
    ) )
  .------.
  |     |]
  \\     /
   \`---'`}
                </pre>
                <h2 className="font-extrabold text-sm tracking-widest uppercase mt-2">*** TICKET DE ARQUEO ***</h2>
                <h3 className="font-black text-xs tracking-wider">SUPERPOS & CAFE DIGITAL</h3>
                <p className="text-[10px] font-bold text-gray-600">Soporte y Tipeos de Alta Calidad</p>
                <div className="border-b border-dashed border-gray-550 my-2"></div>
              </div>

              {(() => {
                const isPrintingPastCierre = selectedCierrePrint !== null;
                const printCierreId = isPrintingPastCierre ? selectedCierrePrint.id : cajaState.cierre.id;
                const printCierreFecha = isPrintingPastCierre ? selectedCierrePrint.fecha : cajaState.cierre.fecha;
                
                let printExpectedEfectivo = cajaState.resumenActual.esperadoEfectivo;
                let printExpectedYape = cajaState.resumenActual.esperadoYape;
                let printDeliveredEfectivo = cajaState.cierre.saldo_efectivo_entregado;
                let printDeliveredYape = cajaState.cierre.saldo_yape_entregado;
                let printMovimientosList = movimientos;

                if (isPrintingPastCierre && selectedCierrePrint) {
                  let cash = 0;
                  let yape = 0;
                  const movs = selectedCierrePrint.movimientos || [];
                  movs.forEach((m: any) => {
                    if (m.tipo === "Ingreso") {
                      cash += m.ingreso_efectivo - m.salida_vuelto_efectivo;
                      yape += m.ingreso_yape - m.salida_vuelto_yape;
                    } else if (m.tipo === "Egreso") {
                      cash -= m.ingreso_efectivo;
                      yape -= m.ingreso_yape;
                    }
                  });
                  printExpectedEfectivo = Math.max(0, cash);
                  printExpectedYape = Math.max(0, yape);
                  printDeliveredEfectivo = selectedCierrePrint.saldo_efectivo_entregado;
                  printDeliveredYape = selectedCierrePrint.saldo_yape_entregado;
                  printMovimientosList = movs;
                }

                const printExpectedTotal = printExpectedEfectivo + printExpectedYape;
                const printDeliveredTotal = printDeliveredEfectivo + printDeliveredYape;
                const printDiffTotal = printDeliveredTotal - printExpectedTotal;

                const printDiffEfectivo = printDeliveredEfectivo - printExpectedEfectivo;
                const printDiffYape = printDeliveredYape - printExpectedYape;

                return (
                  <>
                    <div className="space-y-1 text-[10px] mb-4">
                      <p className="flex justify-between"><strong>ID ARQUEO:</strong> <span>CD-{printCierreId.substring(0, 8).toUpperCase()}</span></p>
                      <p className="flex justify-between"><strong>FECHA CIERRE:</strong> <span>{new Date(printCierreFecha).toLocaleString("es-PE")}</span></p>
                      <p className="flex justify-between"><strong>ESTADO TURNO:</strong> <span className="font-bold">CERRADO Y AUDITADO</span></p>
                      <p className="flex justify-between"><strong>CAJERO:</strong> <span>Operador de Turno</span></p>
                    </div>

                    <div className="border-b border-dashed border-gray-550 my-2"></div>

                    <table className="w-full text-left text-[10px] mb-4 border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-gray-400 font-bold">
                          <th className="py-1">Concepto</th>
                          <th className="py-1 text-right">Esp.</th>
                          <th className="py-1 text-right">Entr.</th>
                          <th className="py-1 text-right">Dif.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-205">
                          <td className="py-1.5">Efectivo</td>
                          <td className="py-1.5 text-right">S/. {printExpectedEfectivo.toFixed(2)}</td>
                          <td className="py-1.5 text-right">S/. {printDeliveredEfectivo.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-bold">
                            {printDiffEfectivo >= 0 ? "+" : ""}{printDiffEfectivo.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-205">
                          <td className="py-1.5">Yape QR</td>
                          <td className="py-1.5 text-right">S/. {printExpectedYape.toFixed(2)}</td>
                          <td className="py-1.5 text-right">S/. {printDeliveredYape.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-bold">
                            {printDiffYape >= 0 ? "+" : ""}{printDiffYape.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="font-extrabold border-t border-gray-400">
                          <td className="py-2">TOTAL CAJA</td>
                          <td className="py-2 text-right">S/. {printExpectedTotal.toFixed(2)}</td>
                          <td className="py-2 text-right">S/. {printDeliveredTotal.toFixed(2)}</td>
                          <td className="py-2 text-right font-black">
                            {printDiffTotal >= 0 ? "+" : ""}{printDiffTotal.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="p-2 border border-gray-400 rounded text-center text-[10px] font-black my-3 bg-gray-50">
                      {printDiffTotal === 0 && "ESTADO: CAJA PERFECTAMENTE CUADRADA"}
                      {printDiffTotal > 0 && `ESTADO: SOBRANTE CAJA (+S/. ${printDiffTotal.toFixed(2)})`}
                      {printDiffTotal < 0 && `ESTADO: FALTANTE DE CAJA (-S/. ${Math.abs(printDiffTotal).toFixed(2)})`}
                    </div>

                    <div className="border-b border-dashed border-gray-550 my-2"></div>

                    <div className="space-y-1.5 mb-5">
                      <p className="text-[10px] font-black text-center tracking-widest uppercase">--- OPERACIONES TURNO ---</p>
                      <div className="text-[9px] space-y-1 font-mono">
                        {printMovimientosList.slice(0, 15).map((mov: any) => (
                          <div key={mov.id} className="flex justify-between items-start gap-1">
                            <span className="truncate max-w-[170px] uppercase">{mov.categoria}</span>
                            <span className="shrink-0 font-bold">S/. {mov.monto_total.toFixed(2)}</span>
                          </div>
                        ))}
                        {printMovimientosList.length === 0 && (
                          <p className="text-[8px] text-gray-500 text-center italic py-2">No se registraron transacciones.</p>
                        )}
                        {printMovimientosList.length > 15 && (
                          <p className="text-[8px] text-gray-600 text-center italic pt-1 border-t border-gray-100">...y {printMovimientosList.length - 15} transacciones más.</p>
                        )}
                      </div>
                    </div>

                    <div className="border-b border-dashed border-gray-550 my-2"></div>

                    {/* Realistic CSS Barcode */}
                    <div className="flex flex-col items-center justify-center my-4 opacity-80 select-none">
                      <div className="flex h-8 w-40 items-center bg-black px-2 py-0.5 gap-[1px]">
                        <div className="h-full bg-white w-[2px]"></div>
                        <div className="h-full bg-white w-[4px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[3px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[4px]"></div>
                        <div className="h-full bg-white w-[2px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[3px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[4px]"></div>
                        <div className="h-full bg-white w-[2px]"></div>
                        <div className="h-full bg-white w-[2px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[3px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                        <div className="h-full bg-white w-[4px]"></div>
                        <div className="h-full bg-white w-[2px]"></div>
                        <div className="h-full bg-white w-[1px]"></div>
                      </div>
                      <span className="text-[8px] tracking-widest text-gray-600 uppercase mt-1 font-bold">
                        * CD-{printCierreId.substring(0, 8).toUpperCase()} *
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-4 text-[9px] text-center font-mono">
                      <div className="space-y-1">
                        <div className="border-t border-gray-400 w-full pt-1"></div>
                        <p className="font-bold">Firma Operador</p>
                        <p className="text-[8px] text-gray-500">Cajero Entregante</p>
                      </div>
                      <div className="space-y-1">
                        <div className="border-t border-gray-400 w-full pt-1"></div>
                        <p className="font-bold">Firma Jefe / Admin</p>
                        <p className="text-[8px] text-gray-500">Recibido Conforme</p>
                      </div>
                    </div>

                    <div className="text-center text-[8px] text-gray-500 mt-8 pt-4 border-t border-dashed border-gray-300 font-bold uppercase tracking-wider">
                      ¡Gracias por su preferencia! • SuperPOS v1.2
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* TEMPLATE B: MONTHLY SETTLEMENT VOUCHER */}
          {activePrint === "liquidacion" && selectedLiquidacionPrint && (
            <div className="max-w-[650px] mx-auto border-2 border-double border-gray-400 p-8 bg-white text-black rounded-lg shadow-sm">
              <div className="text-center space-y-1 mb-6">
                <h2 className="font-extrabold text-lg tracking-widest uppercase">RECIBO DE LIQUIDACIÓN DE COMISIONES</h2>
                <h3 className="font-bold text-sm tracking-wide text-gray-700">SUPERPOS - SERVICIOS DIGITALES</h3>
                <p className="text-xs">Sueldo / Payout de Operación (50% de Participación)</p>
                <div className="border-b-2 border-double border-gray-300 my-3"></div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                <div>
                  <p className="py-0.5"><strong>Periodo Liquidación:</strong> {selectedLiquidacionPrint.mes_anio}</p>
                  <p className="py-0.5"><strong>Emisor:</strong> Administrador SuperPOS</p>
                  <p className="py-0.5"><strong>Estado de Pago:</strong> <span className="font-bold text-green-700 uppercase bg-green-50 px-1.5 py-0.5 border border-green-200 rounded">{selectedLiquidacionPrint.estado_pago}</span></p>
                </div>
                <div className="text-right">
                  <p className="py-0.5"><strong>Fecha Voucher:</strong> {new Date().toLocaleDateString("es-PE")}</p>
                  <p className="py-0.5"><strong>Moneda:</strong> Soles (S/.)</p>
                  <p className="py-0.5"><strong>ID Liquidación:</strong> LIQ-{selectedLiquidacionPrint.mes_anio}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold">
                    <th className="p-3">Descripción del Concepto</th>
                    <th className="p-3 text-right">Monto Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-3">
                      <strong>Servicios / Ventas POS Realizadas</strong>
                      <p className="text-[10px] text-gray-500 font-normal">Consolidado neto de ingresos ingresados en físico (Efectivo) y canales QR (Yape)</p>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      S/. {selectedLiquidacionPrint.ventas ? selectedLiquidacionPrint.ventas.toFixed(2) : selectedLiquidacionPrint.ingreso_bruto_total.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-3">
                      <strong>Trabajos Especiales del Jefe</strong>
                      <p className="text-[10px] text-gray-500 font-normal">Proyectos cotizados por el jefe de forma directa acumulados e inyectados al mes</p>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      S/. {(selectedLiquidacionPrint.tareas || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-bold border-t border-gray-300">
                    <td className="p-3 uppercase">Total Ingreso Bruto Acumulado</td>
                    <td className="p-3 text-right text-sm">
                      S/. {selectedLiquidacionPrint.ingreso_bruto_total.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-purple-50 font-extrabold border-t border-purple-200 text-purple-950">
                    <td className="p-3 uppercase tracking-wider text-sm">
                      COMISIÓN NETO A PAGAR OPERADOR (50%)
                    </td>
                    <td className="p-3 text-right text-base">
                      S/. {selectedLiquidacionPrint.pago_operador.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-4 border border-dashed border-gray-300 rounded bg-gray-50 text-center text-xs leading-normal mb-8">
                El presente documento certifica la liquidación y el abono completo correspondiente al 50% de las ganancias mensuales generadas por el operador de SuperPOS. Al firmar al pie, ambas partes declaran su conformidad total con los montos consignados y la finalización exitosa del ciclo mensual.
              </div>

              <div className="grid grid-cols-2 gap-8 mt-12 pt-8 text-xs text-center">
                <div className="space-y-2">
                  <div className="border-t border-gray-400 w-full pt-2"></div>
                  <p className="font-bold">Recibí Conforme (Sueldo)</p>
                  <p className="text-[10px] text-gray-500">Firma Operador</p>
                </div>
                <div className="space-y-2">
                  <div className="border-t border-gray-400 w-full pt-2"></div>
                  <p className="font-bold">Entregué Conforme (Pago)</p>
                  <p className="text-[10px] text-gray-500">Firma Jefe / Admin</p>
                </div>
              </div>

              <div className="text-center text-[9px] text-gray-450 mt-12 pt-4 border-t border-gray-250">
                SuperPOS v1.1 - Voucher de Pago Oficial - Impreso el {new Date().toLocaleString("es-PE")}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ----------------------------------------------------
          PREMIUM ADMIN AUTHORIZATION MODAL
         ---------------------------------------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-250 z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-400" />
                <h3 className="font-extrabold text-sm text-slate-200 font-sans">Autorización Requerida</h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-semibold font-sans">
              Para {authModalPurpose || "realizar esta acción"}, es necesario ingresar el <strong>PIN de Administrador / Jefe</strong> (0000).
            </p>

            <form onSubmit={handleAuthModalSubmit} className="space-y-4 font-sans">
              <div className="space-y-2">
                <div className="flex gap-2 justify-center h-5">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-2.5 w-2.5 rounded-full transition-all ${
                        idx < authModalPin.length ? "bg-purple-400 shadow-md shadow-purple-500/50 scale-110" : "bg-slate-800 border border-slate-700"
                      }`}
                    />
                  ))}
                </div>
                
                <input
                  type="password"
                  placeholder="Ingrese PIN Admin"
                  maxLength={4}
                  value={authModalPin}
                  onChange={(e) => setAuthModalPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-center tracking-[12px] font-black text-purple-400 text-lg focus:outline-none placeholder:text-slate-800 placeholder:tracking-normal placeholder:text-xs"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-purple-550/15"
                >
                  Validar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          PREMIUM SESSION LOCK OVERLAY / LOCK SCREEN
         ---------------------------------------------------- */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 select-none antialiased">
          {/* Ambient glow backgrounds */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8 flex flex-col">
            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl items-center justify-center shadow-xl shadow-purple-500/25 mb-2">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-purple-400 to-indigo-200 bg-clip-text text-transparent uppercase">
                SuperPOS
              </h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Terminal de Control de Caja</p>
            </div>

            {notif && (
              <div className={`p-3.5 rounded-xl border text-xs font-bold text-center transition animate-in fade-in duration-300 ${
                notif.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-rose-500/10 border-rose-500/20 text-rose-450"
              }`}>
                {notif.text}
              </div>
            )}

            {/* Profile Selection View */}
            {!activeLoginRole ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">Seleccione su Rol de Acceso</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setActiveLoginRole("Operador");
                      setPinInput("");
                    }}
                    className="group bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-emerald-500/30 p-6 rounded-2xl text-center space-y-3 transition duration-300 active:scale-95 shadow-lg flex flex-col items-center justify-center"
                  >
                    <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-200">Operador</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Cajero de Turno</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveLoginRole("Jefe");
                      setPinInput("");
                    }}
                    className="group bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-purple-500/30 p-6 rounded-2xl text-center space-y-3 transition duration-300 active:scale-95 shadow-lg flex flex-col items-center justify-center"
                  >
                    <div className="h-12 w-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-200">Administrador</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Jefe de Local</p>
                    </div>
                  </button>
                </div>
                
                <div className="text-center pt-2">
                  <p className="text-[9px] text-slate-500 font-semibold tracking-wide uppercase">
                    PIN Demo: Operador (1234) • Administrador (0000)
                  </p>
                </div>
              </div>
            ) : (
              // PIN Password entry View with Virtual POS Keyboard
              <div className="space-y-6 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setActiveLoginRole(null)}
                    className="text-[10px] font-black text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                  >
                    ← REGRESAR
                  </button>
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Ingreso: {activeLoginRole === "Jefe" ? "Administrador" : "Operador"}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Ingrese su PIN de Seguridad</p>
                  <div className="flex gap-3 justify-center items-center h-8">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                          idx < pinInput.length
                            ? activeLoginRole === "Jefe"
                              ? "bg-purple-400 shadow-md shadow-purple-500/50 scale-110"
                              : "bg-emerald-400 shadow-md shadow-emerald-500/50 scale-110"
                            : "bg-slate-800 border border-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Virtual Numpad Grid */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto w-full pt-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "E"].map((btn) => {
                    let btnColor = "bg-slate-950/50 hover:bg-slate-950 border border-slate-850 text-slate-200 text-base font-extrabold";
                    if (btn === "C") {
                      btnColor = "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-black";
                    } else if (btn === "E") {
                      btnColor = activeLoginRole === "Jefe"
                        ? "bg-purple-600 hover:bg-purple-500 border border-purple-800 text-white text-xs font-black shadow-md shadow-purple-500/15"
                        : "bg-emerald-650 hover:bg-emerald-600 border border-emerald-800 text-white text-xs font-black shadow-md shadow-emerald-500/15";
                    }
                    
                    return (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleNumpadPress(btn)}
                        className={`h-11 rounded-2xl flex items-center justify-center transition active:scale-90 select-none ${btnColor}`}
                      >
                        {btn === "C" ? "BORRAR" : btn === "E" ? "ENTRAR" : btn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REGISTRAR GASTO RÁPIDO (EGRESO) MODAL
         ---------------------------------------------------- */}
      {showQuickExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowQuickExpenseModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-250 z-10 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-rose-450" />
                <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Registrar Gasto Rápido</h3>
              </div>
              <button onClick={() => setShowQuickExpenseModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Registre salidas urgentes de dinero de la caja diaria (tinta, papel, insumos, etc.).
            </p>

            <form onSubmit={handleEgresoSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Concepto / Descripción del Gasto</label>
                  <input
                    type="text"
                    placeholder="Ej. Tinta de impresora, Papel térmico..."
                    value={egresoDesc}
                    onChange={(e) => setEgresoDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-rose-500 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Monto de Gasto (S/.)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.00"
                    value={egresoMonto}
                    onChange={(e) => setEgresoMonto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-rose-500 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none text-xs font-bold text-rose-350"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Medio de Pago Utilizado</label>
                  <select
                    value={egresoMetodo}
                    onChange={(e) => setEgresoMetodo(e.target.value as "Efectivo" | "Yape")}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-rose-500 rounded-xl py-2.5 px-3 text-slate-200 font-bold focus:outline-none text-xs"
                  >
                    <option value="Efectivo">Efectivo en Caja</option>
                    <option value="Yape">Yape / QR</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickExpenseModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-755 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-650 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-rose-950/20 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? "Registrando..." : "Registrar Salida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          AJUSTES DE TERMINAL & BACKUPS MODAL
         ---------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-250 z-10 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-400" />
                <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Ajustes & Mantenimiento de Terminal</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Backups Panel Card */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-350 uppercase tracking-wide">
                <FileDown className="h-4.5 w-4.5 text-purple-400" />
                <span>Base de Datos y Copias de Seguridad</span>
              </div>
              <p className="text-[11px] text-slate-455 leading-relaxed font-semibold">
                Mantenga sus registros seguros exportando respaldos completos periódicamente en formato JSON, o restaure el sistema en caso de fallos.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Export Card */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await handleExportData();
                      if (res) {
                        showNotification("success", "Copia de seguridad descargada exitosamente en formato JSON.");
                      }
                    } catch (err) {
                      showNotification("error", "Error al exportar base de datos");
                    }
                  }}
                  disabled={isPending}
                  className="flex flex-col items-center justify-center p-4 bg-slate-900/40 hover:bg-purple-950/15 border border-slate-800 hover:border-purple-500/30 rounded-xl space-y-2 text-center transition active:scale-95 disabled:opacity-50"
                >
                  <FileDown className="h-6 w-6 text-purple-400" />
                  <div>
                    <span className="text-[11px] font-black text-slate-200 block">Exportar Base de Datos</span>
                    <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Guardar archivo JSON local</span>
                  </div>
                </button>

                {/* Import Card */}
                <div className="relative">
                  <input
                    type="file"
                    id="import-database-file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    disabled={isPending}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
                  />
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-900/40 hover:bg-emerald-950/15 border border-slate-800 hover:border-emerald-500/30 rounded-xl space-y-2 text-center transition active:scale-95">
                    <Upload className="h-6 w-6 text-emerald-400" />
                    <div>
                      <span className="text-[11px] font-black text-slate-200 block">Importar Base de Datos</span>
                      <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Cargar archivo JSON válido</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Info Card */}
            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Estado del Sistema</span>
                <p className="font-extrabold text-slate-355">Modo Administrador Autorizado</p>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black rounded uppercase">
                En Línea
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-6 rounded-xl text-xs transition active:scale-95"
              >
                Cerrar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          CONFIRMAR IMPORTACIÓN DANGER OVERLAY
         ---------------------------------------------------- */}
      {showConfirmImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-250 z-10 font-sans">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-red-400">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">⚠️ Advertencia Crítica de Reemplazo</h3>
            </div>

            <div className="space-y-3 leading-relaxed text-xs">
              <p className="text-slate-300 font-bold">
                ¡Está a punto de importar una copia de seguridad externa!
              </p>
              <p className="text-slate-400 font-semibold">
                Esta acción <strong className="text-red-400 font-extrabold">SOBREESCRIBIRÁ Y BORRARÁ COMPLETAMENTE</strong> todas las tablas de la base de datos actual (servicios diarios, tareas, cierres y liquidaciones) sin posibilidad de recuperación.
              </p>
              <p className="text-slate-400 font-semibold">
                Para confirmar la operación y proceder, por favor escriba la palabra clave <strong className="text-slate-200 font-extrabold">"IMPORTAR"</strong> a continuación:
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <input
                type="text"
                placeholder="Escriba IMPORTAR"
                value={importKeywordConfirm}
                onChange={(e) => setImportKeywordConfirm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl p-3 text-center font-bold text-slate-200 text-xs focus:outline-none placeholder:text-slate-750"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmImportModal(false);
                    setPendingImportData(null);
                    setImportKeywordConfirm("");
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95"
                >
                  Cancelar Importación
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importKeywordConfirm !== "IMPORTAR" || isPending}
                  className="flex-1 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 disabled:opacity-40 disabled:hover:from-red-700 disabled:hover:to-rose-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-red-950/20"
                >
                  {isPending ? "Sobreescribiendo..." : "Confirmar & Reemplazar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
