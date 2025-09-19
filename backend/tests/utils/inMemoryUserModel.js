const bcrypt = require('bcryptjs');
const { createAsyncQuery } = require('./query');
const {
  getStore,
  setStore,
  generateId,
  cloneDeep,
} = require('./inMemoryStore');

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

function sanitizeUser(doc, { includePassword = false } = {}) {
  if (!doc) {
    return null;
  }

  const copy = cloneDeep(doc);
  if (!includePassword) {
    delete copy.password;
  }
  return new UserDocument(copy, { includePassword });
}

function matchQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '_id') {
      return doc._id === value || doc._id?.toString() === value?.toString();
    }

    if (key === 'email') {
      return doc.email === value;
    }

    if (key === 'isActive') {
      return doc.isActive === value;
    }

    return doc[key] === value;
  });
}

class UserDocument {
  constructor(data = {}, options = {}) {
    this._id = data._id || null;
    this.name = data.name || null;
    this.email = data.email || null;
    this.isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
    this.lastLogin = data.lastLogin ? new Date(data.lastLogin) : data.lastLogin;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    this._passwordHash = data.password || null;
    this._passwordModified = false;
    this._isNew = !data._id;
    this._includePassword = options.includePassword || false;
  }

  set password(value) {
    this._passwordHash = value;
    this._passwordModified = true;
  }

  get password() {
    return this._includePassword ? this._passwordHash : undefined;
  }

  toObject() {
    return {
      _id: this._id,
      name: this.name,
      email: this.email,
      password: this._includePassword ? this._passwordHash : undefined,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
  }

  async comparePassword(candidate) {
    if (!this._passwordHash) {
      return false;
    }
    return bcrypt.compare(candidate, this._passwordHash);
  }

  async save() {
    if (!this.name) {
      throw new Error('Name is required');
    }
    if (!this.email) {
      throw new Error('Email is required');
    }
    if (!EMAIL_REGEX.test(this.email)) {
      throw new Error('Please enter a valid email');
    }
    if (!this._passwordHash) {
      throw new Error('Password is required');
    }
    if (this._passwordModified && this._passwordHash.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const store = getStore('User');
    const now = new Date();

    // Ensure unique email
    const duplicate = store.find(
      (doc) => doc.email === this.email && doc._id !== this._id,
    );
    if (duplicate) {
      throw new Error('User already exists with this email');
    }

    if (this._passwordModified) {
      const salt = await bcrypt.genSalt(12);
      this._passwordHash = await bcrypt.hash(this._passwordHash, salt);
      this._passwordModified = false;
    }

    if (!this._id) {
      this._id = generateId();
      this.createdAt = now;
    }

    this.updatedAt = now;

    const storedDoc = {
      _id: this._id,
      name: this.name,
      email: this.email,
      password: this._passwordHash,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    const existingIndex = store.findIndex((doc) => doc._id === this._id);
    if (existingIndex >= 0) {
      store[existingIndex] = storedDoc;
    } else {
      store.push(storedDoc);
    }

    setStore('User', store);

    return new UserDocument(storedDoc, { includePassword: this._includePassword });
  }
}

class UserModel extends UserDocument {
  constructor(data = {}) {
    super(data, { includePassword: true });
    if (data.password && data.password.length < 60) {
      // assume plain password
      this.password = data.password;
    }
  }

  static async create(data) {
    const doc = new UserModel(data);
    await doc.save();
    return doc;
  }

  static find(query = {}) {
    return createAsyncQuery((state) => {
      const store = getStore('User');
      const includePassword = state.selection?.includes('+password');
      const matches = store
        .filter((doc) => matchQuery(doc, query))
        .map((doc) => sanitizeUser(doc, { includePassword }));

      return matches;
    });
  }

  static findOne(query = {}) {
    return createAsyncQuery((state) => {
      const store = getStore('User');
      const includePassword = state.selection?.includes('+password');
      const doc = store.find((item) => matchQuery(item, query));
      return sanitizeUser(doc, { includePassword });
    });
  }

  static findById(id) {
    return createAsyncQuery((state) => {
      const store = getStore('User');
      const includePassword = state.selection?.includes('+password');
      const doc = store.find((item) => item._id === id);
      return sanitizeUser(doc, { includePassword });
    });
  }

  static async findByIdAndDelete(id) {
    const store = getStore('User');
    const index = store.findIndex((item) => item._id === id);
    if (index === -1) {
      return null;
    }
    const [removed] = store.splice(index, 1);
    setStore('User', store);
    return new UserDocument(removed, { includePassword: false });
  }

  static async deleteMany() {
    setStore('User', []);
  }
}

module.exports = UserModel;
