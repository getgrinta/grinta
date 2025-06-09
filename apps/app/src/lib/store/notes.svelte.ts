import {
  createNote,
  deleteNote,
  getNotes,
  openNote,
  type AppleNote,
} from "$lib/osa";

export class NotesStore {
  notes = $state<AppleNote[]>([]);

  async fetchNotes() {
    this.notes = await getNotes();
  }

  async openNote(id: string) {
    return openNote(id);
  }

  async createNote(name: string, body?: string) {
    return createNote(name, body);
  }

  async deleteNote(id: string) {
    return deleteNote(id);
  }
}

export const notesStore = new NotesStore();
