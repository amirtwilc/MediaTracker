import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Genre, Platform } from '../../types';
import { api, JobStatus } from '../../api';
import { UpdateMediaItem } from './UpdateMediaItem';
import { useAlert } from '../../hooks/useAlert';
import { AlertContainer } from '../common/Alert';

const POLLING_INTERVAL_MS = 1000;
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1800;
const MAX_YEAR = CURRENT_YEAR + 10;

type TabType = 'create' | 'upload' | 'update';
type Category = 'MOVIE' | 'SERIES' | 'GAME';

interface UploadProgressState {
  show: boolean;
  processed: number;
  total: number;
  readCount: number;
  writeCount: number;
  skipCount: number;
  status: string;
}

export const AdminPanel: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('create');
  
  // Reference data
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Alert state
  const { alert, showSuccess, showError, handleApiError } = useAlert();
  
  // Create form state
  const [category, setCategory] = useState<Category>('MOVIE');
  const [name, setName] = useState('');
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // CSV upload state
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    show: false,
    processed: 0,
    total: 0,
    readCount: 0,
    writeCount: 0,
    skipCount: 0,
    status: 'STARTING',
  });

  // Load genres and platforms on mount
  useEffect(() => {
    loadGenresAndPlatforms();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Handle keyboard events for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploadProgress.show) {
        const canClose = ['COMPLETED', 'FAILED', 'STOPPED'].includes(uploadProgress.status);
        if (canClose) {
          handleCloseProgress();
        }
      }
    };

    if (uploadProgress.show) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [uploadProgress.show, uploadProgress.status]);

  const loadGenresAndPlatforms = async () => {
    setIsLoadingData(true);
    try {
      const [genresData, platformsData] = await Promise.all([
        api.admin.getAllGenres(),
        api.admin.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
    } catch (error) {
      handleApiError(error, 'Failed to load genres and platforms');
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateCreateForm = (): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    
    if (year && (parseInt(year) < MIN_YEAR || parseInt(year) > MAX_YEAR)) {
      return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
    }
    
    return null;
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateCreateForm();
    if (validationError) {
      showError(validationError);
      return;
    }
    
    setIsCreating(true);
    
    try {
      await api.admin.createMediaItem({
        category,
        name: name.trim(),
        year: year ? parseInt(year) : undefined,
        genreIds: selectedGenres,
        platformIds: selectedPlatforms,
      });
      
      showSuccess('Media item created successfully!');
      
      // Reset form
      setName('');
      setYear('');
      setSelectedGenres([]);
      setSelectedPlatforms([]);
    } catch (error) {
      handleApiError(error, 'Failed to create media item');
    } finally {
      setIsCreating(false);
    }
  };

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Poll for job status
  const pollStatus = useCallback(async (currentJobId: number) => {
    // Prevent concurrent polling
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const status = await api.admin.getJobStatus(currentJobId);
      setJobStatus(status);

      const readCount = status.readCount || 0;
      const writeCount = status.writeCount || 0;
      const skipCount = status.skipCount || 0;
      const processed = writeCount + skipCount;
      const total = readCount;

      setUploadProgress(prev => ({
        ...prev,
        processed,
        total,
        readCount,
        writeCount,
        skipCount,
        status: status.status || 'RUNNING',
      }));

      // Stop polling if job is complete or failed
      if (['COMPLETED', 'FAILED', 'STOPPED'].includes(status.status || '')) {
        clearPolling();
      }
    } catch (error) {
      console.error('Failed to get job status', error);
      // Don't stop polling on error, might be temporary
    } finally {
      isPollingRef.current = false;
    }
  }, [clearPolling]);

  const handleUploadCSV = async () => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError('Please select a valid CSV file');
      return;
    }

    clearPolling();
    setIsUploading(true);

    try {
      const response = await api.admin.uploadCSV(file);
      const newJobId = response.correlationId;
      
      setJobId(newJobId);
      setJobStatus(null);
      setUploadProgress({
        show: true,
        processed: 0,
        total: 0,
        readCount: 0,
        writeCount: 0,
        skipCount: 0,
        status: 'STARTING',
      });

      await pollStatus(newJobId);
      pollingIntervalRef.current = setInterval(() => pollStatus(newJobId), POLLING_INTERVAL_MS);
    } catch (error) {
      setUploadProgress({
        show: false,
        processed: 0,
        total: 0,
        readCount: 0,
        writeCount: 0,
        skipCount: 0,
        status: 'FAILED',
      });
      
      handleApiError(error, 'Upload error:' + error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseProgress = useCallback(() => {
    clearPolling();
    setUploadProgress({
      show: false,
      processed: 0,
      total: 0,
      readCount: 0,
      writeCount: 0,
      skipCount: 0,
      status: 'STARTING',
    });
    setJobStatus(null);
    setJobId(null);
    setFile(null);
  }, [clearPolling]);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const togglePlatform = (platformId: number) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const progressPercentage = uploadProgress.total > 0
    ? Math.min((uploadProgress.processed / uploadProgress.total) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      <AlertContainer alert={alert} />

      {/* Tab Navigation */}
      <div className="flex gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'create'}
          aria-controls="create-panel"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Create Item
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'update'}
          aria-controls="update-panel"
          onClick={() => setActiveTab('update')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'update'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Update Item
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'upload'}
          aria-controls="upload-panel"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Upload CSV
        </button>
      </div>

      {/* Update Panel */}
      {activeTab === 'update' && (
        <div role="tabpanel" id="update-panel">
          <UpdateMediaItem genres={genres} platforms={platforms} />
        </div>
      )}

      {/* Create Panel */}
      {activeTab === 'create' && (
        <div role="tabpanel" id="create-panel">
          <form
            onSubmit={handleCreateItem}
            className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700"
          >
            {isLoadingData ? (
              <div className="text-center py-8 text-gray-400">
                Loading genres and platforms...
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="category" className="block text-sm text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="SERIES">Series</option>
                    <option value="GAME">Game</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm text-gray-300 mb-2">
                    Year (Optional)
                  </label>
                  <input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder={`e.g., ${CURRENT_YEAR}`}
                    min={MIN_YEAR}
                    max={MAX_YEAR}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Genres ({selectedGenres.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded border border-gray-600">
                    {genres.map((genre) => (
                      <label
                        key={genre.id}
                        className="flex items-center gap-2 text-white cursor-pointer hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGenres.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                          className="cursor-pointer"
                        />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Platforms ({selectedPlatforms.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded border border-gray-600">
                    {platforms.map((platform) => (
                      <label
                        key={platform.id}
                        className="flex items-center gap-2 text-white cursor-pointer hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={() => togglePlatform(platform.id)}
                          className="cursor-pointer"
                        />
                        <span className="text-sm">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating || isLoadingData}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Media Item'}
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {/* Upload Panel */}
      {activeTab === 'upload' && (
        <div role="tabpanel" id="upload-panel" className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700">
          <div>
            <label htmlFor="csv-file" className="block text-sm text-gray-300 mb-2">
              Upload CSV File
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-400">
                CSV format: category, name, year, genres (pipe-separated), platforms (pipe-separated)
              </p>
              <p className="text-xs text-gray-400">
                Example: MOVIE,The Matrix,1999,Action|Sci-Fi,Netflix|Amazon Prime
              </p>
            </div>
          </div>

          <button
            onClick={handleUploadCSV}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={16} />
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>

          {jobStatus && !uploadProgress.show && (
            <div className="mt-4 p-4 bg-gray-700 rounded border border-gray-600">
              <h3 className="font-medium text-white mb-2">Last Job Status</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  Status: <span className="text-white font-medium">{jobStatus.status}</span>
                </p>
                <p className="text-gray-300">
                  Read: <span className="text-white font-medium">{jobStatus.readCount || 0}</span>
                </p>
                <p className="text-gray-300">
                  Written: <span className="text-white font-medium">{jobStatus.writeCount || 0}</span>
                </p>
                <p className="text-gray-300">
                  Skipped: <span className="text-white font-medium">{jobStatus.skipCount || 0}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress Modal */}
      {uploadProgress.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="progress-modal-title"
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 id="progress-modal-title" className="text-xl font-bold text-white">
                Processing CSV Import
              </h3>
              {['COMPLETED', 'FAILED', 'STOPPED'].includes(uploadProgress.status) && (
                <button
                  onClick={handleCloseProgress}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close progress modal"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {uploadProgress.status === 'COMPLETED' && (
                  <>
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-green-400 font-medium">Completed</span>
                  </>
                )}
                {uploadProgress.status === 'FAILED' && (
                  <>
                    <XCircle className="text-red-400" size={20} />
                    <span className="text-red-400 font-medium">Failed</span>
                  </>
                )}
                {['STARTING', 'RUNNING', 'STARTED'].includes(uploadProgress.status) && (
                  <>
                    <Clock className="text-blue-400 animate-spin" size={20} />
                    <span className="text-blue-400 font-medium">Processing...</span>
                  </>
                )}
                {uploadProgress.status === 'STOPPED' && (
                  <>
                    <XCircle className="text-yellow-400" size={20} />
                    <span className="text-yellow-400 font-medium">Stopped</span>
                  </>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 flex items-center justify-center text-xs font-medium ${
                      uploadProgress.status === 'COMPLETED'
                        ? 'bg-green-500'
                        : uploadProgress.status === 'FAILED' || uploadProgress.status === 'STOPPED'
                          ? 'bg-red-500'
                          : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: `${progressPercentage}%`, 
                      minWidth: progressPercentage > 0 ? '2rem' : '0' 
                    }}
                  >
                    {progressPercentage > 10 && (
                      <span className="text-white">{Math.round(progressPercentage)}%</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-300">
                  <span>
                    {uploadProgress.readCount > 0
                      ? `Processed ${uploadProgress.processed} of ${uploadProgress.total} items`
                      : 'Reading CSV file...'}
                  </span>
                  {progressPercentage > 0 && progressPercentage < 100 && (
                    <span>{Math.round(progressPercentage)}%</span>
                  )}
                </div>
              </div>

              {/* Statistics */}
              {(uploadProgress.status === 'COMPLETED' ||
                uploadProgress.status === 'FAILED' ||
                uploadProgress.status === 'STOPPED' ||
                uploadProgress.readCount > 0) && (
                <div className="bg-gray-700 rounded p-4 space-y-2">
                  <h4 className="text-white font-medium mb-3">Statistics</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Total Read:</span>
                      <span className="text-white ml-2 font-medium">
                        {uploadProgress.readCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Successfully Written:</span>
                      <span className="text-green-400 ml-2 font-medium">
                        {uploadProgress.writeCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Skipped:</span>
                      <span className="text-yellow-400 ml-2 font-medium">
                        {uploadProgress.skipCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Processed:</span>
                      <span className="text-blue-400 ml-2 font-medium">
                        {uploadProgress.processed || 0}
                      </span>
                    </div>
                  </div>
                  {uploadProgress.status === 'COMPLETED' && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={16} />
                        Import completed successfully!
                      </p>
                    </div>
                  )}
                  {uploadProgress.status === 'FAILED' && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                        <XCircle size={16} />
                        Import failed. Please check the file format and try again.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};