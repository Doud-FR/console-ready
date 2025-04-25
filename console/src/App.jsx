import { useState, useEffect } from "react";

const MOCK_GROUPS = ["Tous", "Bureau", "Serveurs", "Portables"];

function App() {
  const [machines, setMachines] = useState([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Tous");
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setMachines(data.inventory || []))
      .catch(console.error);
  }, []);

  const filtered = machines.filter((m) => {
    return (
      (group === "Tous" || m.group === group) &&
      (m.hostname?.toLowerCase().includes(search.toLowerCase()) ||
        m.ip?.includes(search))
    );
  });

  const triggerAction = (hostname, action) => {
    fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname, action }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AppliDeploy Console</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          🌙 Dark Mode
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            className="accent-purple-600"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Rechercher par nom ou IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded border w-64 dark:bg-zinc-800 dark:border-zinc-700"
        />

        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="px-4 py-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
        >
          {MOCK_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.map((m) => (
          <div
            key={m.hostname}
            className="rounded-lg p-4 shadow-md bg-white dark:bg-zinc-800 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-lg">{m.hostname}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {m.ip} — {m.os}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => triggerAction(m.hostname, "update")}
                className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={() => triggerAction(m.hostname, "upgrade")}
                className="px-4 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Upgrade Win11
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
