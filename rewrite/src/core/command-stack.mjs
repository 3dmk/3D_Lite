export class CommandStack {
  #undo = [];
  #redo = [];
  #active = false;

  get canUndo() { return this.#undo.length > 0; }
  get canRedo() { return this.#redo.length > 0; }
  get depth() { return this.#undo.length; }
  get redoDepth() { return this.#redo.length; }
  get active() { return this.#active; }

  execute(command, context) {
    if (this.#active) throw new Error('Nested command execution is not allowed');
    this.#requireCommand(command);
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
    const command = this.#undo[this.#undo.length - 1];
    this.#active = true;
    try {
      const result = command.undo(context);
      this.#undo.pop();
      this.#redo.push(command);
      return result === undefined ? true : result;
    } finally {
      this.#active = false;
    }
  }

  redo(context) {
    if (this.#active || !this.canRedo) return false;
    const command = this.#redo[this.#redo.length - 1];
    this.#active = true;
    try {
      const result = command.do(context);
      this.#redo.pop();
      this.#undo.push(command);
      return result === undefined ? true : result;
    } finally {
      this.#active = false;
    }
  }

  clear() {
    if (this.#active) throw new Error('Cannot clear command history during execution');
    this.#undo.length = 0;
    this.#redo.length = 0;
  }

  snapshot() {
    return Object.freeze({
      undoDepth: this.#undo.length,
      redoDepth: this.#redo.length,
      active: this.#active,
      canUndo: this.canUndo,
      canRedo: this.canRedo
    });
  }

  #requireCommand(command) {
    if (!command || typeof command.do !== 'function' || typeof command.undo !== 'function') {
      throw new TypeError('Command requires do() and undo()');
    }
  }
}
