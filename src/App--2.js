import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Other",
];

function getMonth(date) {
  return (
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1).toString().padStart(2, "0")
  );
}

// ---- Multi-tracker storage helpers ----
function saveProjectsToStorage(projects) {
  localStorage.setItem("projects", JSON.stringify(projects));
}
function loadProjectsFromStorage() {
  const data = localStorage.getItem("projects");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ---- COMPONENT ----
export default function App() {
  // PROJECTS STATE
  const [projects, setProjects] = useState(loadProjectsFromStorage());
  const [currentProjectId, setCurrentProjectId] = useState(() =>
    (JSON.parse(localStorage.getItem("lastProjectId")) || null)
  );
  const [newProjectName, setNewProjectName] = useState("");
  
  // EXPENSES STATE (linked to current project)
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];
  const expenses = currentProject ? currentProject.expenses : [];
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
  const [editingIndex, setEditingIndex] = useState(-1);

  // SAVE PROJECTS whenever they change
  useEffect(() => {
    saveProjectsToStorage(projects);
    if (currentProjectId) {
      localStorage.setItem("lastProjectId", JSON.stringify(currentProjectId));
    }
  }, [projects, currentProjectId]);

  // ADD A NEW PROJECT/TRACKER
  function addProject(e) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const id = `proj-${Date.now()}`;
    const newProject = {
      id,
      name: newProjectName.trim(),
      expenses: [],
    };
    setProjects([newProject, ...projects]);
    setCurrentProjectId(id);
    setNewProjectName("");
  }

  // DELETE A PROJECT/TRACKER
  function deleteProject(id) {
    if (!window.confirm("Delete this tracker and all its expenses?")) return;
    const idx = projects.findIndex(p => p.id === id);
    const newList = projects.filter(p => p.id !== id);
    setProjects(newList);
    // If deleted was current, pick another project (or none)
    if (currentProjectId === id) {
      setCurrentProjectId(newList[0]?.id || null);
    }
  }

  // RENAME PROJECT/TRACKER
  function renameProject(id, newName) {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, name: newName } : p
    ));
  }

  // ADD or EDIT expense for the current tracker
  const addOrEditExpense = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || !currentProject) return;

    const exp = {
      amount: parseFloat(amount),
      category,
      description,
      date,
    };
    const updatedProjects = projects.map(p => {
      if (p.id !== currentProject.id) return p;
      let newExpenses;
      if (editingIndex >= 0) {
        newExpenses = [...p.expenses];
        newExpenses[editingIndex] = exp;
      } else {
        newExpenses = [...p.expenses, exp];
      }
      return { ...p, expenses: newExpenses };
    });
    setProjects(updatedProjects);
    setAmount("");
    setCategory(categories[0]);
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setEditingIndex(-1);
  };

  // Start editing an expense
  const startEdit = (i) => {
    const exp = expenses[i];
    setAmount(exp.amount);
    setCategory(exp.category);
    setDescription(exp.description);
    setDate(exp.date);
    setEditingIndex(i);
  };

  // Delete an expense
  const deleteExpense = (i) => {
    if (!currentProject) return;
    if (!window.confirm("Delete this expense?")) return;
    const updatedProjects = projects.map(p => {
      if (p.id !== currentProject.id) return p;
      const newExpenses = [...p.expenses];
      newExpenses.splice(i, 1);
      return { ...p, expenses: newExpenses };
    });
    setProjects(updatedProjects);
    if (editingIndex === i) setEditingIndex(-1);
  };

  // Import/Export for each tracker
  // Import CSV
  const importCSV = (event) => {
    const file = event.target.files[0];
    if (!file || !currentProject) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split("\n");
      lines.shift();
      const imported = lines.map((line) => {
        const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
        const items = line
          .match(regex)
          .map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"'));
        return {
          amount: parseFloat(items[0]),
          category: items[1],
          description: items[2],
          date: items[3],
        };
      });
      setProjects(projects.map(p =>
        p.id === currentProject.id ? { ...p, expenses: imported } : p
      ));
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  // Import JSON
  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file || !currentProject) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported) && imported[0]?.amount !== undefined) {
          setProjects(projects.map(p =>
            p.id === currentProject.id ? { ...p, expenses: imported } : p
          ));
        } else {
          alert("Invalid JSON structure.");
        }
      } catch {
        alert("Invalid JSON file.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  // Export as CSV
  const exportCSV = () => {
    if (!currentProject) return;
    const header = "Amount,Category,Description,Date\n";
    const rows = expenses
      .map(
        (exp) =>
          `${exp.amount},"${exp.category.replace(/"/g, '""')}","${exp.description.replace(/"/g, '""')}",${exp.date}`
      )
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentProject.name.replace(/\s+/g, "_")}_expenses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as JSON
  const exportJSON = () => {
    if (!currentProject) return;
    const json = JSON.stringify(expenses, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentProject.name.replace(/\s+/g, "_")}_expenses.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- Monthly filtering, summary, and chart ---
  const filteredExpenses = expenses.filter(
    (exp) => getMonth(new Date(exp.date)) === selectedMonth
  );
  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const pieData = {
    labels: categories,
    datasets: [
      {
        data: categories.map((cat) =>
          filteredExpenses
            .filter((exp) => exp.category === cat)
            .reduce((sum, exp) => sum + exp.amount, 0)
        ),
        backgroundColor: [
          "#8bc34a",
          "#2196f3",
          "#ff9800",
          "#e91e63",
          "#9c27b0",
          "#607d8b",
        ],
      },
    ],
  };

  const months = [
    ...new Set(expenses.map((exp) => getMonth(new Date(exp.date)))),
  ]
    .sort()
    .reverse();

  // ---- UI ----
  return (
    <div
      style={{
        maxWidth: 500,
        margin: "2rem auto",
        padding: 24,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 4px 16px #0002",
      }}
    >
      {/* Project Selector & Manager */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <form onSubmit={addProject} style={{ flex: "auto", display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Add new tracker (e.g. Trip, Event...)"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            style={{ flex: "auto" }}
          />
          <button type="submit">Add</button>
        </form>
        {projects.length > 0 && (
          <select
            value={currentProject ? currentProject.id : ""}
            onChange={e => setCurrentProjectId(e.target.value)}
            style={{ minWidth: 120, maxWidth: 200 }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {currentProject && (
          <>
            <button
              title="Rename tracker"
              style={{ background: "#f5f5f5", border: "none", marginLeft: 2, padding: "3px 7px", borderRadius: 4, fontSize: 14 }}
              onClick={() => {
                const newName = prompt("Rename tracker:", currentProject.name);
                if (newName) renameProject(currentProject.id, newName.trim());
              }}
            >✏️</button>
            <button
              title="Delete tracker"
              style={{ background: "#ffeaea", border: "none", marginLeft: 2, padding: "3px 7px", borderRadius: 4, color: "#c00", fontSize: 14 }}
              onClick={() => deleteProject(currentProject.id)}
              disabled={projects.length < 2}
            >🗑️</button>
          </>
        )}
      </div>

      {/* LOGO */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <img src="/logo.svg" alt="Expense Tracker Logo" width={60} height={60} />
      </div>

      <h2 style={{ textAlign: "center" }}>
        Expense Tracker {currentProject ? `: ${currentProject.name}` : ""}
      </h2>
      {projects.length === 0 && (
        <div style={{ textAlign: "center", color: "#888", margin: "1.5rem 0" }}>
          Add your first tracker above!
        </div>
      )}
      {projects.length > 0 && (
        <>
          {/* Expense Form */}
          <form onSubmit={addOrEditExpense} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ flex: 1 }}
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <button type="submit" style={{ width: "100%", padding: 8 }}>
              {editingIndex >= 0 ? "Update Expense" : "Add Expense"}
            </button>
          </form>

          {/* Month Selector and Import/Export */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <label>
              Month:{" "}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {[getMonth(new Date()), ...months]
                  .filter((m, i, arr) => arr.indexOf(m) === i)
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>
            </label>
            <div>
              <button
                onClick={exportCSV}
                style={{
                  padding: "4px 8px",
                  fontSize: 14,
                  marginRight: 5,
                }}
              >
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                style={{
                  padding: "4px 8px",
                  fontSize: 14,
                  marginRight: 5,
                }}
              >
                Export JSON
              </button>
              <label
                style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  background: "#eee",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  marginRight: 5,
                }}
              >
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={importCSV}
                />
              </label>
              <label
                style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  background: "#eee",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={importJSON}
                />
              </label>
            </div>
          </div>

          {/* Summary and Pie Chart */}
          <h3 style={{ textAlign: "center" }}>Total: CHF {total.toFixed(2)}</h3>
          <Pie data={pieData} style={{ maxHeight: 250, margin: "auto" }} />

          {/* Expense List */}
          <h4 style={{ marginTop: 20 }}>Expenses</h4>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              maxHeight: 170,
              overflowY: "auto",
            }}
          >
            {filteredExpenses.length === 0 && (
              <li>No expenses this month.</li>
            )}
            {filteredExpenses.map((exp, i) => (
              <li
                key={i}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "6px 0",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <b>CHF {exp.amount.toFixed(2)}</b> - {exp.category}
                  <br />
                  <span style={{ color: "#555" }}>{exp.description}</span>
                  <span
                    style={{ color: "#888", fontSize: 13, marginLeft: 10 }}
                  >
                    {exp.date}
                  </span>
                </span>
                <span>
                  <button
                    style={{
                      marginLeft: 6,
                      padding: "2px 7px",
                      fontSize: 13,
                      background: "#f0f0f0",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => startEdit(i)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    style={{
                      marginLeft: 6,
                      padding: "2px 7px",
                      fontSize: 13,
                      background: "#ffeaea",
                      border: "none",
                      borderRadius: 4,
                      color: "#c00",
                      cursor: "pointer",
                    }}
                    onClick={() => deleteExpense(i)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
