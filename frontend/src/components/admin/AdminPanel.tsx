import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Genre, Platform } from '../../types';
import { api } from '../../services/api';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'upload'>('create');
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

  useEffect(() => {
    loadGenresAndPlatforms();
  }, []);

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
    
    try {
      const response = await api.uploadCSV(file);
      setJobId(response.jobExecutionId);
      alert('CSV upload started!');
      
      // Poll for status
      const interval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(response.jobExecutionId);
          setJobStatus(status);
          
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            clearInterval(interval);
          }
        } catch (error) {
          clearInterval(interval);
        }
      }, 2000);
    } catch (error: any) {
      alert(error.message || 'Failed to upload CSV');
    }
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

          {jobStatus && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <h3 className="font-medium text-white mb-2">Job Status</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">Status: <span className="text-white">{jobStatus.status}</span></p>
                <p className="text-gray-300">Read: <span className="text-white">{jobStatus.readCount}</span></p>
                <p className="text-gray-300">Written: <span className="text-white">{jobStatus.writeCount}</span></p>
                <p className="text-gray-300">Skipped: <span className="text-white">{jobStatus.skipCount}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};