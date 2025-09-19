const { createAsyncQuery } = require('./query');
const {
  getStore,
  setStore,
  generateId,
  cloneDeep,
} = require('./inMemoryStore');

const WORKOUT_TYPES = ['easy', 'tempo', 'interval', 'long_run', 'recovery', 'race', 'cross_training'];
const INTENSITY_LEVELS = ['low', 'moderate', 'high', 'maximum'];
const DISTANCE_UNITS = ['km', 'miles'];
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function matchQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '_id') {
      return doc._id === value || doc._id?.toString() === value?.toString();
    }

    if (key === 'userId') {
      return doc.userId === value || doc.userId?.toString() === value?.toString();
    }

    if (key.startsWith('workouts.') && key.endsWith('._id')) {
      const workoutId = value;
      return ensureArray(doc.workouts).some((workout) => workout._id === workoutId);
    }

    return doc[key] === value;
  });
}

function applySort(documents, sortSpec = {}) {
  const entries = Object.entries(sortSpec);
  if (!entries.length) {
    return documents;
  }

  const [field, direction] = entries[0];
  return documents.slice().sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue === bValue) {
      return 0;
    }

    if (direction < 0) {
      return aValue > bValue ? -1 : 1;
    }

    return aValue > bValue ? 1 : -1;
  });
}

function validatePlanData(plan) {
  if (!plan.userId) {
    throw new Error('Training plan requires userId');
  }
  if (!plan.title) {
    throw new Error('Training plan requires title');
  }
  if (!plan.description) {
    throw new Error('Training plan requires description');
  }
  if (typeof plan.duration !== 'number') {
    throw new Error('Training plan requires duration');
  }
  if (!DIFFICULTY_LEVELS.includes(plan.difficulty)) {
    throw new Error('Invalid difficulty level');
  }

  ensureArray(plan.workouts).forEach((workout) => {
    if (!WORKOUT_TYPES.includes(workout.type)) {
      throw new Error('Invalid workout type');
    }
    if (!INTENSITY_LEVELS.includes(workout.intensity)) {
      throw new Error('Invalid workout intensity');
    }
  });

  if (plan.inputData) {
    const { distanceUnit, maxDistanceUnit } = plan.inputData;
    if (distanceUnit && !DISTANCE_UNITS.includes(distanceUnit)) {
      throw new Error('Invalid distance unit');
    }
    if (maxDistanceUnit && !DISTANCE_UNITS.includes(maxDistanceUnit)) {
      throw new Error('Invalid distance unit');
    }
  }
}

class WorkoutDocument {
  constructor(data = {}) {
    this._id = data._id || generateId();
    this.title = data.title || '';
    this.description = data.description || '';
    this.type = data.type;
    this.duration = data.duration || 0;
    this.distance = data.distance;
    this.intensity = data.intensity;
    this.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : data.scheduledDate || null;
    this.completed = typeof data.completed === 'boolean' ? data.completed : false;
    this.instructions = ensureArray(data.instructions);
    this.fitFileUrl = data.fitFileUrl || null;
    this.weekNumber = data.weekNumber;
    this.dayOfWeek = data.dayOfWeek;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
  }

  toJSON() {
    return {
      _id: this._id,
      title: this.title,
      description: this.description,
      type: this.type,
      duration: this.duration,
      distance: this.distance,
      intensity: this.intensity,
      scheduledDate: this.scheduledDate,
      completed: this.completed,
      instructions: this.instructions,
      fitFileUrl: this.fitFileUrl,
      weekNumber: this.weekNumber,
      dayOfWeek: this.dayOfWeek,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

class WorkoutArray extends Array {
  constructor(items = []) {
    const initialItems = Array.isArray(items)
      ? items
      : items && typeof items[Symbol.iterator] === 'function'
        ? Array.from(items)
        : [];

    super(
      ...initialItems.map((item) => (item instanceof WorkoutDocument ? item : new WorkoutDocument(item))),
    );
    Object.setPrototypeOf(this, WorkoutArray.prototype);
  }

  id(workoutId) {
    return this.find((workout) => workout._id === workoutId);
  }

  toJSON() {
    return Array.from(this, (workout) =>
      typeof workout?.toJSON === 'function' ? workout.toJSON() : { ...workout },
    );
  }
}

class TrainingPlanDocument {
  constructor(data = {}) {
    this._id = data._id || null;
    this.userId = data.userId || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.duration = data.duration || 0;
    this.difficulty = data.difficulty || 'beginner';
    this.goals = ensureArray(data.goals);
    this.workouts = new WorkoutArray(data.workouts || []);
    this.inputData = data.inputData ? cloneDeep(data.inputData) : undefined;
    this.aiGeneratedContent = data.aiGeneratedContent || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
  }

  toObject() {
    return {
      _id: this._id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      duration: this.duration,
      difficulty: this.difficulty,
      goals: cloneDeep(this.goals),
      workouts: this.workouts.toJSON(),
      inputData: this.inputData ? cloneDeep(this.inputData) : undefined,
      aiGeneratedContent: this.aiGeneratedContent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    validatePlanData(this);

    const store = getStore('TrainingPlan');
    const now = new Date();

    if (!this._id) {
      this._id = generateId();
      this.createdAt = now;
      this.workouts.forEach((workout) => {
        workout.createdAt = now;
        workout.updatedAt = now;
      });
    }

    this.updatedAt = now;
    this.workouts.forEach((workout) => {
      workout.updatedAt = now;
    });

    const storedDoc = {
      _id: this._id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      duration: this.duration,
      difficulty: this.difficulty,
      goals: cloneDeep(this.goals),
      workouts: this.workouts.toJSON(),
      inputData: this.inputData ? cloneDeep(this.inputData) : undefined,
      aiGeneratedContent: this.aiGeneratedContent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    const existingIndex = store.findIndex((doc) => doc._id === this._id);
    if (existingIndex >= 0) {
      store[existingIndex] = storedDoc;
    } else {
      store.push(storedDoc);
    }

    setStore('TrainingPlan', store);

    return new TrainingPlanDocument(storedDoc);
  }
}

class TrainingPlanModel extends TrainingPlanDocument {
  constructor(data = {}) {
    super(data);
  }

  static async create(data) {
    const plan = new TrainingPlanModel(data);
    await plan.save();
    return plan;
  }

  static find(query = {}) {
    return createAsyncQuery((state) => {
      const store = getStore('TrainingPlan');
      let matches = store.filter((doc) => matchQuery(doc, query));
      if (state.sort) {
        matches = applySort(matches, state.sort);
      }
      if (state.limit) {
        matches = matches.slice(0, state.limit);
      }
      return matches.map((doc) => new TrainingPlanDocument(doc));
    });
  }

  static findOne(query = {}) {
    return createAsyncQuery((state) => {
      const store = getStore('TrainingPlan');
      let matches = store.filter((doc) => matchQuery(doc, query));
      if (state.sort) {
        matches = applySort(matches, state.sort);
      }
      const doc = matches[0];
      return doc ? new TrainingPlanDocument(doc) : null;
    });
  }

  static async findById(id) {
    const store = getStore('TrainingPlan');
    const doc = store.find((item) => item._id === id);
    return doc ? new TrainingPlanDocument(doc) : null;
  }

  static async findByIdAndDelete(id) {
    const store = getStore('TrainingPlan');
    const index = store.findIndex((doc) => doc._id === id);
    if (index === -1) {
      return null;
    }
    const [removed] = store.splice(index, 1);
    setStore('TrainingPlan', store);
    return new TrainingPlanDocument(removed);
  }

  static async findOneAndDelete(query = {}) {
    const store = getStore('TrainingPlan');
    const index = store.findIndex((doc) => matchQuery(doc, query));
    if (index === -1) {
      return null;
    }
    const [removed] = store.splice(index, 1);
    setStore('TrainingPlan', store);
    return new TrainingPlanDocument(removed);
  }

  static async deleteMany() {
    setStore('TrainingPlan', []);
  }
}

module.exports = TrainingPlanModel;
