import { X } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useGetDefaultSettings, useUpdateSettings } from "../hooks/useQueries";

interface FileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsApplied: (
    minutes: number,
    seconds: number,
    tatamiNo: string,
  ) => void;
}

export default function FileMenu({
  isOpen,
  onClose,
  onSettingsApplied,
}: FileMenuProps) {
  const { data: settings } = useGetDefaultSettings();
  const updateSettings = useUpdateSettings();

  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(30);
  const [tatamiNo, setTatamiNo] = useState("1");

  useEffect(() => {
    if (settings) {
      setMinutes(Number(settings.minutes));
      setSeconds(Number(settings.seconds));
      setTatamiNo(settings.tatamiNumber);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      tatamiNumber: tatamiNo,
      minutes: BigInt(minutes),
      seconds: BigInt(seconds),
    });
    onSettingsApplied(minutes, seconds, tatamiNo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div className="bg-gray-900 border border-gray-600 rounded-lg shadow-2xl p-4 w-64">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm">File Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="match-minutes"
              className="text-gray-300 text-xs block mb-1"
            >
              Default Match Time
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="match-minutes"
                type="number"
                min={0}
                max={99}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-16 text-center bg-gray-800 text-white border border-gray-600 rounded py-1 text-sm"
              />
              <span className="text-gray-400 text-xs">min</span>
              <input
                id="match-seconds"
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-16 text-center bg-gray-800 text-white border border-gray-600 rounded py-1 text-sm"
              />
              <span className="text-gray-400 text-xs">sec</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="tatami-no"
              className="text-gray-300 text-xs block mb-1"
            >
              Default Tatami No.
            </label>
            <input
              id="tatami-no"
              type="text"
              value={tatamiNo}
              onChange={(e) => setTatamiNo(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded py-1 px-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded transition-all"
          >
            {updateSettings.isPending ? "Saving..." : "Save & Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
