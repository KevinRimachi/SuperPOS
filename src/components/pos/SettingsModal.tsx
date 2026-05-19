"use client";

import React, { useRef, useState } from "react";
import { Settings, X, Volume2, VolumeX, ShieldAlert, ShieldCheck, Download, Upload, Loader2, Sparkles, FileJson } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoLockEnabled: boolean;
  onToggleAutoLock: () => void;
  autoLockTime: number;
  onSelectAutoLockTime: (time: number) => void;
  onExport: () => Promise<void>;
  onImportTriggered: (fileContent: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoLockEnabled,
  onToggleAutoLock,
  autoLockTime,
  onSelectAutoLockTime,
  onExport,
  onImportTriggered,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileRead = (file: File) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!file.name.endsWith(".json")) {
      setErrorMsg("Por favor, suba únicamente archivos de respaldo con extensión .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.version || !json.cierreDiario || !json.movimientos) {
          setErrorMsg("El archivo JSON no corresponde a un formato de respaldo válido de SuperPOS.");
          return;
        }
        // Send up to trigger custom validation confirmation popup!
        onImportTriggered(json);
      } catch (err) {
        setErrorMsg("Error al decodificar el archivo de respaldo. Asegúrese de que sea un JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Settings Card */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-250 z-10 text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-400 animate-spin-slow" />
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Ajustes Generales del Terminal</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Configurations grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Box 1: Chimes & Audio */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-850 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
              <Volume2 className="h-4 w-4 text-purple-400" />
              <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px]">Efectos de Sonido</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Habilita la reproducción de chimes y sonidos de confirmación en cobros, egresos y bloqueos.
            </p>
            <button
              type="button"
              onClick={onToggleSound}
              className={`w-full py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                soundEnabled
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Sonidos Activos</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>Sonidos Silenciados</span>
                </>
              )}
            </button>
          </div>

          {/* Box 2: Auto-Lock */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-850 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px]">Auto-Bloqueo de Seguridad</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Cierra sesión automáticamente si no se detectan pulsaciones o toques en la terminal.
            </p>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleAutoLock}
                className={`flex-1 py-1.5 px-3 rounded-xl border text-[10px] font-black tracking-wider uppercase transition ${
                  autoLockEnabled
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {autoLockEnabled ? "Habilitado" : "Deshabilitado"}
              </button>
              
              {autoLockEnabled && (
                <select
                  value={autoLockTime}
                  onChange={(e) => onSelectAutoLockTime(parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] font-bold text-slate-200 focus:outline-none"
                >
                  <option value={5}>5 Min</option>
                  <option value={10}>10 Min</option>
                  <option value={15}>15 Min</option>
                </select>
              )}
            </div>
          </div>

        </div>

        {/* Box 3: Backups / Resguardo */}
        <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-850 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
            <Download className="h-4 w-4 text-blue-400" />
            <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px]">Copia de Seguridad y Restauración</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Resguarda todas tus transacciones, liquidaciones y tareas del jefe en un archivo descargable. Súbelo de nuevo en cualquier terminal para recuperar tus balances al 100%.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* Export button */}
            <button
              type="button"
              onClick={onExport}
              className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-650 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-blue-900/10"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Datos (JSON)</span>
            </button>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 rounded-xl border border-dashed py-2 px-3 text-center cursor-pointer transition select-none flex items-center justify-center gap-2 ${
                dragActive
                  ? "bg-purple-500/10 border-purple-400 text-purple-300"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              <Upload className="h-4 w-4" />
              <span className="font-bold text-[10px]">Importar Respaldo (.json)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileRead(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Inline alert helper */}
          {errorMsg && (
            <div className="text-[10px] text-rose-450 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10 font-bold">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-[10px] text-emerald-450 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
