import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validatePath, validateRepoId, validateContentSize, validateEmail } from '../validation.js';

describe('validatePath', () => {
  it('should normalize paths', () => {
    expect(validatePath('/Documents')).toBe('/Documents');
    expect(validatePath('/Documents/')).toBe('/Documents');
    expect(validatePath('Documents')).toBe('/Documents');
  });

  it('should handle path separators', () => {
    expect(validatePath('\\Documents\\file.txt')).toBe('/Documents/file.txt');
    expect(validatePath('/Documents//file.txt')).toBe('/Documents/file.txt');
  });

  it('should reject path traversal attempts', () => {
    expect(() => validatePath('/../../../etc/passwd')).toThrow('path traversal not allowed');
    expect(() => validatePath('/Documents/../../../etc')).toThrow('path traversal not allowed');
  });

  it('should allow valid relative paths', () => {
    expect(validatePath('/Documents/../Images')).toBe('/Images');
    expect(validatePath('/./Documents')).toBe('/Documents');
  });

  it('should handle root path', () => {
    expect(validatePath('/')).toBe('/');
  });
});

describe('validateRepoId', () => {
  it('should accept valid UUIDs', () => {
    expect(validateRepoId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateRepoId('12345678-1234-1234-1234-123456789abc')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(() => validateRepoId('')).toThrow('Repository ID is required');
    expect(() => validateRepoId('not-a-uuid')).toThrow('Invalid repository ID format');
    expect(() => validateRepoId('550e8400-e29b-41d4-a716')).toThrow('Invalid repository ID format');
  });
});

describe('validateContentSize', () => {
  it('should calculate UTF-8 content size', () => {
    const content = 'Hello, World!';
    expect(validateContentSize(content)).toBe(13);
  });

  it('should calculate base64 content size', () => {
    const base64Content = 'base64:' + Buffer.from('Hello, World!').toString('base64');
    expect(validateContentSize(base64Content)).toBe(13);
  });

  it('should reject content exceeding max size', () => {
    const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
    expect(() => validateContentSize(largeContent, 100 * 1024 * 1024)).toThrow('exceeds maximum');
  });

  it('should accept content within limit', () => {
    const content = 'Small content';
    expect(() => validateContentSize(content, 100)).not.toThrow();
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name@example.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(() => validateEmail('')).toThrow('Invalid email format');
    expect(() => validateEmail('not-an-email')).toThrow('Invalid email format');
    expect(() => validateEmail('@example.com')).toThrow('Invalid email format');
  });
});
