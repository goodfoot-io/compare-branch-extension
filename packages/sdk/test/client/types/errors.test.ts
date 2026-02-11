import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from '../../../src/client/types/errors.js';
import type { FieldError } from '../../../src/protocol/index.js';

describe('Error Types', () => {
  describe('ApiError', () => {
    it('should create with message and code', () => {
      const error = new ApiError('Something went wrong', 'ERR_UNKNOWN');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('ERR_UNKNOWN');
    });

    it('should create with message, code, and fields', () => {
      const fields: FieldError[] = [
        { field: 'title', message: 'Title is required' },
        { field: 'description', message: 'Description is too short' }
      ];
      const error = new ApiError('Validation failed', 'ERR_VALIDATION', fields);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('ERR_VALIDATION');
      expect(error.fields).toEqual(fields);
    });

    it('should inherit from Error', () => {
      const error = new ApiError('Test error', 'TEST_CODE');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have name ApiError', () => {
      const error = new ApiError('Test error', 'TEST_CODE');
      expect(error.name).toBe('ApiError');
    });

    it('should have message accessible', () => {
      const error = new ApiError('Accessible message', 'MSG_CODE');
      expect(error.message).toBe('Accessible message');
    });

    it('should have code accessible', () => {
      const error = new ApiError('Test', 'ACCESS_CODE');
      expect(error.code).toBe('ACCESS_CODE');
    });

    it('should have fields undefined when not provided', () => {
      const error = new ApiError('No fields', 'NO_FIELDS');
      expect(error.fields).toBeUndefined();
    });

    it('should have fields accessible when provided', () => {
      const fields: FieldError[] = [{ field: 'email', message: 'Invalid email format' }];
      const error = new ApiError('Field error', 'FIELD_ERR', fields);
      expect(error.fields).toBeDefined();
      expect(error.fields).toHaveLength(1);
      const firstField = error.fields?.[0];
      expect(firstField?.field).toBe('email');
      expect(firstField?.message).toBe('Invalid email format');
    });
  });

  describe('NetworkError', () => {
    it('should create with message', () => {
      const error = new NetworkError('Connection failed');
      expect(error.message).toBe('Connection failed');
    });

    it('should create with message and cause', () => {
      const cause = new Error('Socket timeout');
      const error = new NetworkError('Request failed', cause);
      expect(error.message).toBe('Request failed');
      expect(error.cause).toBe(cause);
    });

    it('should inherit from Error', () => {
      const error = new NetworkError('Network card');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have name NetworkError', () => {
      const error = new NetworkError('Test network error');
      expect(error.name).toBe('NetworkError');
    });

    it('should have message accessible', () => {
      const error = new NetworkError('Accessible network message');
      expect(error.message).toBe('Accessible network message');
    });

    it('should have cause undefined when not provided', () => {
      const error = new NetworkError('No cause');
      expect(error.cause).toBeUndefined();
    });

    it('should have cause accessible when provided', () => {
      const cause = new Error('Underlying connection error');
      const error = new NetworkError('Connection lost', cause);
      expect(error.cause).toBeDefined();
      expect(error.cause).toBe(cause);
      expect(error.cause!.message).toBe('Underlying connection error');
    });
  });
});
