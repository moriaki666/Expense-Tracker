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

function saveToStorage(expenses) {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function loadFromStorage() {
  const data = localStorage.getItem("expenses");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export default function App() {
  const [expenses, setExpenses] = useState(loadFromStorage());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
  const [editingIndex, setEditingIndex] = useState(-1);

  // Save to localStorage whenever expenses change
  useEffect(() => {
    saveToStorage(expenses);
  }, [expenses]);

  // Add or Edit expense handler
  const addOrEditExpense = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    const exp = {
      amount: parseFloat(amount),
      category,
      description,
      date,
    };

    if (editingIndex >= 0) {
      const updated = [...expenses];
      updated[editingIndex] = exp;
      setExpenses(updated);
      setEditingIndex(-1);
    } else {
      setExpenses([...expenses, exp]);
    }
    setAmount("");
    setCategory(categories[0]);
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
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
    if (window.confirm("Delete this expense?")) {
      const updated = [...expenses];
      updated.splice(i, 1);
      setExpenses(updated);
      if (editingIndex === i) setEditingIndex(-1);
    }
  };

  // Import CSV
  const importCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Split into lines
      const lines = text.trim().split("\n");
      // Remove header
      lines.shift();
      // Parse each line
      const imported = lines.map((line) => {
        // Handle commas in description or category
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
      setExpenses(imported);
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  // Import JSON
  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        // Check if valid structure
        if (Array.isArray(imported) && imported[0]?.amount !== undefined) {
          setExpenses(imported);
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
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as JSON
  const exportJSON = () => {
    const json = JSON.stringify(expenses, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter expenses by selected month
  const filteredExpenses = expenses.filter(
    (exp) => getMonth(new Date(exp.date)) === selectedMonth
  );

  // Calculate summary
  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Pie chart data
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

  // Get unique months for dropdown
  const months = [
    ...new Set(expenses.map((exp) => getMonth(new Date(exp.date)))),
  ]
    .sort()
    .reverse();

  return (
    <div
      style={{
        maxWidth: 470,
        margin: "2rem auto",
        padding: 24,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 4px 16px #0002",
      }}
    >
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <img src="/logo.svg" alt="Expense Tracker Logo" width={60} height={60} />
    </div>
      <h2 style={{ textAlign: "center" }}>Expense Tracker</h2>
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
            style={{ padding: "4px 8px", fontSize: 14, marginRight: 5 }}
          >
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            style={{ padding: "4px 8px", fontSize: 14, marginRight: 5 }}
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
      <h3 style={{ textAlign: "center" }}>Total: CHF {total.toFixed(2)}</h3>
      <Pie data={pieData} style={{ maxHeight: 250, margin: "auto" }} />
      <h4 style={{ marginTop: 20 }}>Expenses</h4>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          maxHeight: 170,
          overflowY: "auto",
        }}
      >
        {filteredExpenses.length === 0 && <li>No expenses this month.</li>}
        {filteredExpenses.map((exp, i) => {
          // Find index in all expenses, not just filtered
          const idx = expenses.findIndex(
            (e) =>
              e.amount === exp.amount &&
              e.category === exp.category &&
              e.description === exp.description &&
              e.date === exp.date
          );
          return (
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
                <b>CHF{exp.amount.toFixed(2)}</b> - {exp.category}
                <br />
                <span style={{ color: "#555" }}>{exp.description}</span>
                <span style={{ color: "#888", fontSize: 13, marginLeft: 10 }}>
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
                  onClick={() => startEdit(idx)}
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
                  onClick={() => deleteExpense(idx)}
                  title="Delete"
                >
                  🗑️
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
