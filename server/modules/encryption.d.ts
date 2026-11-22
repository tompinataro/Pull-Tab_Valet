declare function encryptPassword(password: string): string;
declare function comparePassword(candidatePassword: string, storedPassword: string): boolean;

declare const encryption: {
  encryptPassword: typeof encryptPassword;
  comparePassword: typeof comparePassword;
};

export = encryption;
