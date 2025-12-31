import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Genre, Platform } from '../../types';
import { api } from '../../services/api';
import { UpdateMediaItem } from './UpdateMediaItem';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'upload' | 'update'>('create');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  
  // Create form state
  const [category, setCategory] = useState<'MOVIE' | 'SERIES' | 'GAME'>('MOVIE');
  const [name, setName] = useState('');
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  
  // CSV upload state
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadGenresAndPlatforms();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const [uploadProgress, setUploadProgress] = useState<{ 
    show: boolean; 
    processed: number; 
    total: number;
    readCount: number;
    writeCount: number;
    skipCount: number;
    status: string;
  }>({
    show: false,
    processed: 0,
    total: 0,
    readCount: 0,
    writeCount: 0,
    skipCount: 0,
    status: 'STARTING',
  });

  const loadGenresAndPlatforms = async () => {
    try {
      const [genresData, platformsData] = await Promise.all([
        api.getAllGenres(),
        api.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.createMediaItem({
        category,
        name,
        year: year ? parseInt(year) : null,
        genreIds: selectedGenres,
        platformIds: selectedPlatforms,
      });
      
      alert('Media item created successfully!');
      setName('');
      setYear('');
      setSelectedGenres([]);
      setSelectedPlatforms([]);
    } catch (error: any) {
      alert(error.message || 'Failed to create item');
    }
  };

  const handleUploadCSV = async () => {
    if (!file) return;

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      const response = await api.uploadCSV(file);
      setJobId(response.jobExecutionId);
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

      // Start polling for status
      const pollStatus = async () => {
        try {
          const status = await api.getJobStatus(response.jobExecutionId);
          setJobStatus(status);

          // Calculate progress
          const readCount = status.readCount || 0;
          const writeCount = status.writeCount || 0;
          const skipCount = status.skipCount || 0;
          const processed = writeCount + skipCount;
          
          // Use readCount as total (items read from CSV)
          // If readCount is 0, the job hasn't started reading yet
          const total = readCount;

          setUploadProgress({ 
            show: true, 
            processed, 
            total,
            readCount,
            writeCount,
            skipCount,
            status: status.status || 'RUNNING',
          });

          // Stop polling if job is complete or failed
          if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'STOPPED') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } catch (error) {
          console.error('Failed to get job status', error);
          // Don't stop polling on error, might be temporary
        }
      };

      // Poll immediately, then every second
      pollStatus();
      pollingIntervalRef.current = setInterval(pollStatus, 1000);
    } catch (error: any) {
      setUploadProgress({ 
        show: false, 
        processed: 0, 
        total: 0,
        readCount: 0,
        writeCount: 0,
        skipCount: 0,
        status: 'FAILED',
      });
      alert(error.message || 'Failed to upload CSV');
    }
  };

  const handleCloseProgress = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Create Item
        </button>
        <button
          onClick={() => setActiveTab('update')}
          className={`px-4 py-2 rounded ${activeTab === 'update'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
            }`}
        >
          Update Item
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Upload CSV
        </button>
      </div>

      {activeTab === 'update' && <UpdateMediaItem />}

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateItem} className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            >
              <option value="MOVIE">Movie</option>
              <option value="SERIES">Series</option>
              <option value="GAME">Game</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Year (Optional)</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 1999"
              min="1800"
              max="2100"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Genres</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(genre.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      } else {
                        setSelectedGenres(selectedGenres.filter(id => id !== genre.id));
                      }
                    }}
                  />
                  {genre.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {platforms.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                      }
                    }}
                  />
                  {platform.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
          >
            Create Media Item
          </button>
        </form>
      ) : (
        <div className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
            <p className="text-xs text-gray-400 mt-2">
              CSV format: category, name, year, genres (comma-separated), platforms (comma-separated)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Example: MOVIE,The Matrix,1999,Action|Sci-Fi,Netflix|Amazon Prime
            </p>
          </div>

          <button
            onClick={handleUploadCSV}
            disabled={!file}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Upload CSV
          </button>

          {jobStatus && !uploadProgress.show && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <h3 className="font-medium text-white mb-2">Last Job Status</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">Status: <span className="text-white">{jobStatus.status}</span></p>
                <p className="text-gray-300">Read: <span className="text-white">{jobStatus.readCount || 0}</span></p>
                <p className="text-gray-300">Written: <span className="text-white">{jobStatus.writeCount || 0}</span></p>
                <p className="text-gray-300">Skipped: <span className="text-white">{jobStatus.skipCount || 0}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Upload Progress Modal */}
      {uploadProgress.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Processing CSV Import</h3>
              {(uploadProgress.status === 'COMPLETED' || uploadProgress.status === 'FAILED' || uploadProgress.status === 'STOPPED') && (
                <button
                  onClick={handleCloseProgress}
                  className="text-gray-400 hover:text-white"
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
                {(uploadProgress.status === 'STARTING' || uploadProgress.status === 'RUNNING' || uploadProgress.status === 'STARTED') && (
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
                  {uploadProgress.total > 0 ? (
                    <div
                      className={`h-6 rounded-full transition-all duration-500 ${
                        uploadProgress.status === 'COMPLETED'
                          ? 'bg-green-500'
                          : uploadProgress.status === 'FAILED' || uploadProgress.status === 'STOPPED'
                          ? 'bg-red-500'
                          : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (uploadProgress.processed / uploadProgress.total) * 100)}%`
                      }}
                    />
                  ) : (
                    <div className="h-6 bg-blue-600 rounded-full animate-pulse" style={{ width: '10%' }} />
                  )}
                </div>
                <div className="flex justify-between text-sm text-gray-300">
                  <span>
                    {uploadProgress.total > 0 ? (
                      <>
                        Processed: {uploadProgress.processed} / {uploadProgress.total} items
                      </>
                    ) : (
                      'Reading CSV file...'
                    )}
                  </span>
                  {uploadProgress.total > 0 && (
                    <span className="font-medium">
                      {Math.round((uploadProgress.processed / uploadProgress.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Statistics */}
              {(uploadProgress.status === 'COMPLETED' || uploadProgress.status === 'FAILED' || uploadProgress.status === 'STOPPED' || uploadProgress.readCount > 0) && (
                <div className="bg-gray-700 rounded p-4 space-y-2">
                  <h4 className="text-white font-medium mb-3">Statistics</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Total Read:</span>
                      <span className="text-white ml-2 font-medium">{uploadProgress.readCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Successfully Written:</span>
                      <span className="text-green-400 ml-2 font-medium">{uploadProgress.writeCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Skipped:</span>
                      <span className="text-yellow-400 ml-2 font-medium">{uploadProgress.skipCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Processed:</span>
                      <span className="text-blue-400 ml-2 font-medium">{uploadProgress.processed || 0}</span>
                    </div>
                  </div>
                  {uploadProgress.status === 'COMPLETED' && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-green-400 text-sm font-medium">
                        ✓ Import completed successfully!
                      </p>
                    </div>
                  )}
                  {uploadProgress.status === 'FAILED' && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-red-400 text-sm font-medium">
                        ✗ Import failed. Please check the file format and try again.
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