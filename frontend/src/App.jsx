import { useEffect, useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setTitle('');
    load();
  }

  async function toggle(id) {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH' });
    load();
  }

  async function remove(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 640,
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1>Minhas Tarefas</h1>

      <form
        onSubmit={add}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova tarefa..."
          style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Adicionar
        </button>
      </form>

      {error && (
        <p style={{ color: 'crimson' }}>Erro ao carregar tarefas: {error}</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((t) => (
          <li
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
            />
            <span
              style={{
                flex: 1,
                textDecoration: t.done ? 'line-through' : 'none',
                color: t.done ? '#888' : 'inherit',
              }}
            >
              {t.title}
            </span>
            <button onClick={() => remove(t.id)}>Remover</button>
          </li>
        ))}
        {tasks.length === 0 && !error && (
          <li style={{ padding: '0.5rem 0', color: '#666' }}>
            Nenhuma tarefa ainda.
          </li>
        )}
      </ul>
    </main>
  );
}
