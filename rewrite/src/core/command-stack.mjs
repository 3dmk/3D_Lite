export class CommandStack {
  #undo = [];
  #redo = [];
  #active = false;

  get canUndo() { return this.#undo.length > 0; }
  get canRedo() { return this.#redo.length > 0; }
  get depth() { return this.#undo.length; }

  execute(command, context) {
    if (this.#active) throw new Error('Nested command execution is not allowed');
    if (!command || typeof command.do !== 'function' || typeof command.undo !== 'function') {
      throw new TypeError('Command requires do() and undo()');
    }
    this.#active = true;
    try {
      const result = command.do(context);
      this.#undo.push(command);
      this.#redo.length = 0;
      return result;
    } catch (error) {
      try { command.rollback?.(context); } catch {}
      throw error;
    } finally {
      this.#active = false;
    }
  }

  undo(context) {
    if (this.#active || !this.canUndo) return false;
    this.#active = true;
    try {
      const command = this.#undo.pop();
      command.undo(context);
      this.#redo.push(command);
      return true;
    } finally {
      this.#active = false;
    }
  }

  redo(context) {
    if (this.#active || !this.canRedo) return false;
    this.#active = true;
    try {
      const command = this.#redo.pop();
      command.do(context);
      this.#undo.push(command);
      return true;
    } finally {
      this.#active = false;
    }
  }

  clear() {
    if (this.#active) throw new Error('Cannot clear command history during execution');
    this.#undo.length = 0;
    this.#redo.length = 0;
  }
}
