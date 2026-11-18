import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', color: '#f59e0b' },
  { id: 'transport', name: 'Transport', color: '#3b82f6' },
  { id: 'bills', name: 'Bills', color: '#8b5cf6' },
  { id: 'shopping', name: 'Shopping', color: '#ec4899' },
  { id: 'entertainment', name: 'Entertainment', color: '#14b8a6' },
  { id: 'other', name: 'Other', color: '#64748b' },
]

const today = () => new Date().toISOString().slice(0, 10)
const monthKey = (date) => date.slice(0, 7)
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [expenses, setExpenses] = useState(() => readStorage('expense-tracker-expenses', []))
  const [categories, setCategories] = useState(() => readStorage('expense-tracker-categories', DEFAULT_CATEGORIES))
  const [showForm, setShowForm] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ amount: '', category: 'food', date: today(), note: '' })
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#64748b')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today()))
  const [filterCategory, setFilterCategory] = useState('all')
  const [message, setMessage] = useState('')

  useEffect(() => {
    localStorage.setItem('expense-tracker-expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('expense-tracker-categories', JSON.stringify(categories))
  }, [categories])

  const currentMonth = monthKey(today())
  const currentMonthExpenses = expenses.filter((item) => monthKey(item.date) === currentMonth)
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const monthTotal = currentMonthExpenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const lastMonthDate = new Date()
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonthKey = monthKey(lastMonthDate.toISOString().slice(0, 10))
  const lastMonthTotal = expenses
    .filter((item) => monthKey(item.date) === lastMonthKey)
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const monthChange = lastMonthTotal === 0
    ? (monthTotal > 0 ? 100 : 0)
    : ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100

  const visibleExpenses = useMemo(() => expenses
    .filter((item) => monthKey(item.date) === selectedMonth)
    .filter((item) => filterCategory === 'all' || item.category === filterCategory)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [expenses, selectedMonth, filterCategory])

  const categoryTotals = categories.map((category) => ({
    ...category,
    total: expenses
      .filter((item) => monthKey(item.date) === selectedMonth && item.category === category.id)
      .reduce((sum, item) => sum + Number(item.amount), 0),
  })).filter((item) => item.total > 0)

  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const key = monthKey(date.toISOString().slice(0, 10))
    return {
      key,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      total: expenses.filter((item) => monthKey(item.date) === key)
        .reduce((sum, item) => sum + Number(item.amount), 0),
    }
  })
  const maxTrend = Math.max(...trend.map((item) => item.total), 1)
  const chartTotal = categoryTotals.reduce((sum, item) => sum + item.total, 0)
  let runningPercent = 0
  const donutGradient = categoryTotals.length
    ? `conic-gradient(${categoryTotals.map((item) => {
      const start = runningPercent
      runningPercent += (item.total / chartTotal) * 100
      return `${item.color} ${start}% ${runningPercent}%`
    }).join(', ')})`
    : 'conic-gradient(#e9eaf0 0% 100%)'

  const openNewForm = () => {
    setEditingId(null)
    setForm({ amount: '', category: categories[0]?.id || '', date: today(), note: '' })
    setShowForm(true)
  }

  const saveExpense = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !form.category || !form.date) {
      setMessage('Please enter a valid amount, category and date.')
      return
    }
    const expense = { id: editingId || Date.now(), amount, category: form.category, date: form.date, note: form.note.trim() }
    setExpenses((previous) => editingId
      ? previous.map((item) => item.id === editingId ? expense : item)
      : [...previous, expense])
    setShowForm(false)
    setEditingId(null)
    setMessage(editingId ? 'Expense updated.' : 'Expense added successfully.')
  }

  const editExpense = (expense) => {
    setEditingId(expense.id)
    setForm({ amount: String(expense.amount), category: expense.category, date: expense.date, note: expense.note || '' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteExpense = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses((previous) => previous.filter((item) => item.id !== id))
      setMessage('Expense deleted.')
    }
  }

  const saveCategory = (event) => {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) return
    if (categories.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== editingCategoryId)) {
      setMessage('That category already exists.')
      return
    }
    if (editingCategoryId) {
      setCategories((previous) => previous.map((item) => item.id === editingCategoryId
        ? { ...item, name, color: categoryColor } : item))
    } else {
      const id = `custom-${Date.now()}`
      setCategories((previous) => [...previous, { id, name, color: categoryColor }])
    }
    setCategoryName('')
    setCategoryColor('#64748b')
    setEditingCategoryId(null)
    setMessage('Category saved.')
  }

  const editCategory = (category) => {
    setEditingCategoryId(category.id)
    setCategoryName(category.name)
    setCategoryColor(category.color)
  }

  const deleteCategory = (category) => {
    const used = expenses.some((item) => item.category === category.id)
    if (used) {
      setMessage('This category is used by expenses. Reassign or delete those expenses first.')
      return
    }
    if (window.confirm(`Delete the ${category.name} category?`)) {
      setCategories((previous) => previous.filter((item) => item.id !== category.id))
      if (form.category === category.id) setForm((previous) => ({ ...previous, category: categories.find((item) => item.id !== category.id)?.id || '' }))
      setMessage('Category deleted.')
    }
  }

  const exportCSV = () => {
    const rows = [
      ['Date', 'Amount', 'Category', 'Note'],
      ...expenses.map((item) => [
        item.date,
        item.amount,
        categories.find((category) => category.id === item.category)?.name || 'Deleted category',
        item.note || '',
      ]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'expense-tracker-records.csv'
    link.click()
    URL.revokeObjectURL(url)
    setMessage('CSV downloaded.')
  }

  const categoryNameFor = (id) => categories.find((item) => item.id === id)?.name || 'Other'
  const categoryColorFor = (id) => categories.find((item) => item.id === id)?.color || '#64748b'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">₹</span><span>SpendWise</span></a>
        <nav className="top-actions">
          <button className="button button-ghost" onClick={() => setShowCategories(!showCategories)}>Manage Categories</button>
          <button className="button button-primary" onClick={openNewForm}>＋ Add Expense</button>
        </nav>
      </header>

      <main className="container">
        <section className="page-heading">
          <div>
            <p className="eyebrow">PERSONAL FINANCE OVERVIEW</p>
            <h1>My Expenses</h1>
            <p className="subheading">A clearer view of where your money goes.</p>
          </div>
          <div className="date-pill">Today · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </section>

        {message && <div className="notice" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

        <section className="summary-grid">
          <article className="summary-card summary-primary">
            <div className="summary-top"><span>Total expenses</span><span className="summary-icon">₹</span></div>
            <strong>{money(total)}</strong>
            <small>All recorded transactions</small>
          </article>
          <article className="summary-card">
            <div className="summary-top"><span>This month</span><span className="summary-icon lavender">◷</span></div>
            <strong>{money(monthTotal)}</strong>
            <small className={monthChange > 0 ? 'change-up' : 'change-down'}>
              {lastMonthTotal === 0 ? 'No previous-month baseline' : `${Math.abs(monthChange).toFixed(1)}% ${monthChange > 0 ? 'higher' : 'lower'} than last month`}
            </small>
          </article>
          <article className="summary-card">
            <div className="summary-top"><span>Transactions</span><span className="summary-icon mint">↗</span></div>
            <strong>{expenses.length}</strong>
            <small>Expenses saved</small>
          </article>
        </section>

        {showForm && (
          <section className="panel form-panel">
            <div className="panel-heading"><div><p className="eyebrow">{editingId ? 'UPDATE RECORD' : 'NEW RECORD'}</p><h2>{editingId ? 'Edit expense' : 'Add an expense'}</h2></div><button className="close-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
            <form className="expense-form" onSubmit={saveExpense}>
              <label>Amount (₹)<input type="number" min="0.01" step="0.01" placeholder="e.g. 250" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
              <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
              <label className="full-field">Note <span className="optional">(optional, up to 120 characters)</span><input type="text" maxLength="120" placeholder="What was this expense for?" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
              <div className="form-actions full-field"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button button-primary">{editingId ? 'Save changes' : 'Save expense'}</button></div>
            </form>
          </section>
        )}

        {showCategories && (
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">ORGANIZE YOUR SPENDING</p><h2>Category manager</h2></div><button className="close-button" onClick={() => setShowCategories(false)} aria-label="Close categories">×</button></div>
            <form className="category-form" onSubmit={saveCategory}>
              <input aria-label="Category name" placeholder="New category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength="30" required />
              <input aria-label="Category colour" type="color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} />
              <button className="button button-primary" type="submit">{editingCategoryId ? 'Update category' : 'Add category'}</button>
              {editingCategoryId && <button className="button button-ghost" type="button" onClick={() => { setEditingCategoryId(null); setCategoryName('') }}>Cancel edit</button>}
            </form>
            <div className="category-manager-list">
              {categories.map((category) => <div className="category-manager-row" key={category.id}><span className="category-dot" style={{ background: category.color }} /><strong>{category.name}</strong><span className="row-spacer" /><button className="text-button" onClick={() => editCategory(category)}>Edit</button><button className="text-button danger-text" onClick={() => deleteCategory(category)}>Delete</button></div>)}
            </div>
            <p className="helper-text">A category cannot be deleted while expenses are assigned to it.</p>
          </section>
        )}

        <section className="analytics-grid">
          <article className="panel analytics-panel">
            <div className="panel-heading"><div><p className="eyebrow">SPENDING BY CATEGORY</p><h2>Category breakdown</h2></div><input className="month-input" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></div>
            <div className="donut-layout">
              <div className="donut" style={{ background: donutGradient }}><div className="donut-hole"><span>Total</span><strong>{money(chartTotal)}</strong></div></div>
              <div className="legend">{categoryTotals.length ? categoryTotals.map((item) => <div className="legend-row" key={item.id}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{money(item.total)}</strong></div>) : <p className="muted">No spending recorded for this month.</p>}</div>
            </div>
          </article>
          <article className="panel analytics-panel">
            <div className="panel-heading"><div><p className="eyebrow">LAST SIX MONTHS</p><h2>Monthly trend</h2></div></div>
            <div className="bar-chart">
              {trend.map((item) => <div className="bar-column" key={item.key}><div className="bar-value">{item.total ? money(item.total) : '—'}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${(item.total / maxTrend) * 100}%` }} /></div><span>{item.label}</span></div>)}
            </div>
          </article>
        </section>

        <section className="panel expenses-panel">
          <div className="panel-heading expenses-heading"><div><p className="eyebrow">YOUR RECORDS</p><h2>Recent expenses</h2></div><div className="table-actions"><select aria-label="Filter by category" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="button button-outline" onClick={exportCSV} disabled={expenses.length === 0}>↓ Export CSV</button></div></div>
          {visibleExpenses.length === 0 ? <div className="empty-state"><div className="empty-icon">₹</div><h3>No expenses found</h3><p>Add an expense or choose another month or category filter.</p><button className="button button-primary" onClick={openNewForm}>＋ Add your first expense</button></div> : (
            <div className="table-wrap"><table><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th className="actions-heading">Actions</th></tr></thead><tbody>{visibleExpenses.map((expense) => <tr key={expense.id}><td><strong>{expense.note || categoryNameFor(expense.category)}</strong><span className="mobile-note">{expense.note && categoryNameFor(expense.category)}</span></td><td><span className="category-tag"><i style={{ background: categoryColorFor(expense.category) }} />{categoryNameFor(expense.category)}</span></td><td>{new Date(`${expense.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="amount-cell">{money(expense.amount)}</td><td className="row-actions"><button className="text-button" onClick={() => editExpense(expense)}>Edit</button><button className="text-button danger-text" onClick={() => deleteExpense(expense.id)}>Delete</button></td></tr>)}</tbody></table></div>
          )}
        </section>
        <footer className="footer">SpendWise · Your expenses, organized. <span>Your data is saved in this browser.</span></footer>
      </main>
    </div>
  )
}

export default App
