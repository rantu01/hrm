'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Search, X, Plus, Info, Copy, Download, MoreHorizontal, Image as ImageIcon, Calendar, HardDrive, Grid3X3, List, Eye, Trash2, Folder, FolderOpen } from 'lucide-react';

export default function MediaLibraryPage() {
  const [media, setMedia] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCreateDirectory, setShowCreateDirectory] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedMediaInfo, setSelectedMediaInfo] = useState(null);
  const itemsPerPage = 12;
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const allRes = await fetch('/api/media', { credentials: 'include' });
        if (!allRes.ok) throw new Error('Failed to load media');
        const allData = await allRes.json();
        const allArray = Array.isArray(allData.media) ? allData.media : [];
        if (cancelled) return;
        setAllMedia(allArray);
        setDirectories(Array.isArray(allData.directories) ? allData.directories : []);
        if (currentDirectory) {
          const params = new URLSearchParams();
          params.append('directory_id', currentDirectory);
          const filteredRes = await fetch(`/api/media?${params.toString()}`, { credentials: 'include' });
          if (filteredRes.ok) {
            const filteredData = await filteredRes.json();
            const filteredArray = Array.isArray(filteredData.media) ? filteredData.media : [];
            if (!cancelled) setMedia(filteredArray);
          } else {
            if (!cancelled) setMedia(allArray);
          }
        } else {
          if (!cancelled) setMedia(allArray);
        }
      } catch (e) {
        toast.error('Failed to load media');
        if (!cancelled) {
          setMedia([]);
          setAllMedia([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentDirectory, refreshKey]);

  const filteredMedia = useMemo(() => {
    let filtered = media.filter((item) =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.file_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered = filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.file_name || '').toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'type':
          aValue = a.mime_type || '';
          bValue = b.mime_type || '';
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [media, searchTerm, sortBy, sortOrder]);

  const createDirectory = async () => {
    if (!newDirectoryName.trim()) return;
    try {
      const res = await fetch('/api/media/directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newDirectoryName }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || 'Directory created successfully');
        setNewDirectoryName('');
        setShowCreateDirectory(false);
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(result.message || 'Failed to create directory');
      }
    } catch {
      toast.error('Network error: Failed to create directory');
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    const validFiles = Array.from(files);
    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }
    const formData = new FormData();
    validFiles.forEach((file) => formData.append('files[]', file));
    if (currentDirectory) formData.append('directory_id', currentDirectory);

    try {
      const res = await fetch('/api/media/batch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const result = await res.json();
      if (res.ok) {
        const data = Array.isArray(result.data) ? result.data : [];
        setMedia((prev) => [...data, ...prev]);
        setAllMedia((prev) => [...data, ...prev]);
        toast.success(result.message || 'Files uploaded');
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((err) => toast.error(err));
        }
      } else {
        if (result.errors && Array.isArray(result.errors)) {
          result.errors.forEach((err) => toast.error(err));
        } else if (result.message) {
          toast.error(result.message);
        } else {
          toast.error('Failed to upload files');
        }
        if (result.allowed_types) toast.error(`Allowed types: ${result.allowed_types}`);
        if (result.max_size_mb) toast.error(`Max file size: ${result.max_size_mb} MB`);
      }
    } catch {
      toast.error('Error uploading files');
    }
    setUploading(false);
    setIsUploadModalOpen(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const requestDelete = (item) => {
    setMediaToDelete(item);
  };

  const cancelDelete = () => {
    if (deletingId) return;
    setMediaToDelete(null);
  };

  const deleteMedia = async (id) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE', credentials: 'include' });
      const result = await res.json();
      if (res.ok) {
        setMedia((prev) => prev.filter((item) => String(item.id) !== String(id)));
        setAllMedia((prev) => prev.filter((item) => String(item.id) !== String(id)));
        toast.success(result.message || 'Media deleted successfully');
        if (infoModalOpen) setInfoModalOpen(false);
      } else {
        toast.error(result.message || 'Failed to delete media');
      }
    } catch {
      toast.error('Error deleting media');
    }
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) return;
    setDeletingId(mediaToDelete.id);
    try {
      await deleteMedia(mediaToDelete.id);
    } finally {
      setDeletingId(null);
      setMediaToDelete(null);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('File URL copied to clipboard');
  };

  const handleDownload = async (id, filename) => {
    try {
      const res = await fetch(`/api/media/${id}/download`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed: Network error');
    }
  };

  const handleShowInfo = (item) => {
    setSelectedMediaInfo(item);
    setInfoModalOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <div className="h-4 w-4 bg-gray-500 rounded text-white text-xs flex items-center justify-center font-bold">FILE</div>;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <div className="h-4 w-4 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">PDF</div>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <div className="h-4 w-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">DOC</div>;
    if (mimeType.includes('csv') || mimeType.includes('spreadsheet')) return <div className="h-4 w-4 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">CSV</div>;
    if (mimeType.startsWith('video/')) return <div className="h-4 w-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold">VID</div>;
    if (mimeType.startsWith('audio/')) return <div className="h-4 w-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">AUD</div>;
    return <div className="h-4 w-4 bg-gray-500 rounded text-white text-xs flex items-center justify-center font-bold">FILE</div>;
  };

  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  const getSortLabel = () => {
    const labels = { name: 'Name', date: 'Date', size: 'Size', type: 'Type' };
    return `${labels[sortBy]} ${sortOrder === 'asc' ? '↑' : '↓'}`;
  };

  return (
    <PageTemplate
      title="Media Library"
      description="Manage your media files and organize them in folders"
      actions={[{ label: 'Upload Media', icon: <Plus className="h-4 w-4" />, variant: 'default', onClick: () => setIsUploadModalOpen(true), loading: uploading }]}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-72 xl:w-80 lg:flex-shrink-0">
          <Card className="lg:h-[calc(100vh-12rem)] flex flex-col">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="p-3 sm:p-4 border-b">
                <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide mb-2 sm:mb-3">Quick Access</h3>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-1">
                  <Button
                    variant={currentDirectory === null ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start h-9 text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => setCurrentDirectory(null)}
                  >
                    <span className="mr-2">🏠</span>
                    <span className="truncate flex-1 text-left min-w-0 font-medium">All Files</span>
                    <Badge variant="outline" className="ml-1 sm:ml-2 text-xs flex-shrink-0 min-w-[1.75rem] justify-center bg-background">
                      {allMedia.length}
                    </Badge>
                  </Button>
                </div>
              </div>

              <div className="p-4 border-b flex-1 min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Folders</h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowCreateDirectory(true)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {showCreateDirectory && (
                  <div className="mb-3 space-y-2">
                    <Input
                      placeholder="Folder name..."
                      value={newDirectoryName}
                      onChange={(e) => setNewDirectoryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createDirectory()}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={createDirectory} size="sm" className="h-7 text-xs px-3 flex-1">Create</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3 flex-1" onClick={() => { setShowCreateDirectory(false); setNewDirectoryName(''); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 overflow-y-auto max-h-[40vh] lg:max-h-[calc(100vh-32rem)] pr-1">
                  {directories.map((dir) => {
                    const dirFileCount = allMedia.filter((item) => String(item.directory_id) === String(dir.id)).length;
                    return (
                      <Button
                        key={dir.id}
                        variant={currentDirectory === dir.id ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start h-9 text-sm px-3"
                        onClick={() => setCurrentDirectory(dir.id)}
                        title={dir.name}
                      >
                        {currentDirectory === dir.id ? <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" /> : <Folder className="h-4 w-4 mr-2 flex-shrink-0" />}
                        <span className="truncate flex-1 text-left min-w-0">{dir.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs flex-shrink-0 min-w-[2rem] justify-center">{dirFileCount}</Badge>
                      </Button>
                    );
                  })}
                  {directories.length === 0 && !showCreateDirectory && (
                    <p className="text-xs text-muted-foreground text-center py-4">No folders yet</p>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">Storage</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">{formatFileSize(allMedia.reduce((acc, item) => acc + (item.size || 0), 0))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Card className="mb-4 flex-shrink-0">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                <div className="flex-1">
                  <div className="relative max-w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search media files..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-10 h-9 lg:h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('grid')}>
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('list')}>
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [s, o] = v.split('-'); setSortBy(s); setSortOrder(o); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="date-desc">Date (Newest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="size-desc">Size (Largest)</SelectItem>
                      <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                      <SelectItem value="type-asc">Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-3 lg:gap-6 items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md"><ImageIcon className="h-4 w-4 text-primary" /></div>
                    <span className="text-xs lg:text-sm font-semibold">{filteredMedia.length} Files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/10 rounded-md"><HardDrive className="h-4 w-4 text-green-600" /></div>
                    <span className="text-xs lg:text-sm font-semibold">{formatFileSize(filteredMedia.reduce((acc, item) => acc + (item.size || 0), 0))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md"><ImageIcon className="h-4 w-4 text-blue-600" /></div>
                    <span className="text-xs lg:text-sm font-semibold">{filteredMedia.filter((item) => (item.mime_type || '').startsWith('image/')).length} Images</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-0 lg:h-[calc(100vh-20rem)]">
            <CardContent className="p-3 lg:p-6 flex flex-col h-full overflow-hidden bg-[#F0F0F1] dark:bg-gray-800">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading media...</p>
                </div>
              ) : currentMedia.length === 0 ? (
                <div className="text-center py-8 lg:py-16">
                  <div className="mx-auto w-16 h-16 lg:w-24 lg:h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="h-8 w-8 lg:h-10 lg:w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold mb-2">No media files found</h3>
                  <p className="text-sm text-muted-foreground mb-4 lg:mb-6">
                    {searchTerm ? `No results found for "${searchTerm}"` : 'Get started by uploading your first media file'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsUploadModalOpen(true)} size="lg">
                      <Plus className="h-4 w-4 mr-2" /> Upload Media
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {viewMode === 'grid' ? (
                      <div className="h-full overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                          {currentMedia.map((item) => (
                            <div key={item.id} className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
                              <div className="relative aspect-square bg-muted flex items-center justify-center cursor-pointer" onClick={() => handleShowInfo(item)}>
                                {String(item.mime_type || '').startsWith('image/') ? (
                                  <img src={item.thumb_url || item.url} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = item.url; }} />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-4">
                                    <div className="mb-2 text-2xl">{getFileIcon(item.mime_type)}</div>
                                    <div className="text-xs text-center font-medium text-muted-foreground truncate w-full">{(item.mime_type || '').split('/')[1]?.toUpperCase() || 'FILE'}</div>
                                  </div>
                                )}
                                <div className="absolute top-2 left-2">
                                  <Badge variant="secondary" className="text-xs bg-background/95">{(item.mime_type || '').split('/')[1]?.toUpperCase()}</Badge>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                <div>
                                  <h3 className="text-sm font-medium truncate" title={item.name}>{item.name}</h3>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><HardDrive className="h-3 w-3" />{formatFileSize(item.size)}</p>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 28rem)' }}>
                        <div className="space-y-3 p-2">
                          {currentMedia.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-4 border rounded-lg hover:shadow-sm transition-all duration-200 bg-card cursor-pointer" onClick={() => handleShowInfo(item)}>
                              <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                {String(item.mime_type || '').startsWith('image/') ? (
                                  <img src={item.thumb_url || item.url} alt={item.name} className="w-full h-full object-cover rounded-md" onError={(e) => { e.currentTarget.src = item.url; }} />
                                ) : (
                                  getFileIcon(item.mime_type)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium truncate" title={item.name}>{item.name}</h3>
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">{(item.mime_type || '').split('/')[1]?.toUpperCase()}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatFileSize(item.size)}</span>
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(startIndex + itemsPerPage, filteredMedia.length)}</span> of <span className="font-semibold">{filteredMedia.length}</span> results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>« Previous</Button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let page;
                            if (totalPages <= 5) page = i + 1;
                            else if (currentPage <= 3) page = i + 1;
                            else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                            else page = currentPage - 2 + i;
                            return (
                              <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="w-10 h-8" onClick={() => setCurrentPage(page)}>{page}</Button>
                            );
                          })}
                        </div>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}>Next »</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Media Files</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsUploadModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-6">
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-all duration-200 ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-all duration-200 ${dragActive ? 'scale-110' : ''}`}>
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className={`h-8 w-8 transition-colors ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{dragActive ? 'Drop files here' : 'Upload your files'}</h3>
                  <p className="text-sm text-muted-foreground mb-6">Drag and drop files here, or click to browse</p>
                  <Input type="file" multiple onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" id="file-upload-modal" />
                  <Button type="button" onClick={() => document.getElementById('file-upload-modal')?.click()} disabled={uploading} size="lg">
                    {uploading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Uploading...</>) : (<><Plus className="h-4 w-4 mr-2" />Choose Files</>)}
                  </Button>
                </div>
                {dragActive && <div className="absolute inset-0 bg-blue-500/10 rounded-xl" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Media Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setInfoModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            {selectedMediaInfo && (
            <div className="flex flex-col lg:flex-row lg:h-[calc(95vh-4rem)] overflow-hidden">
              <div className="flex-1 flex items-center justify-center bg-[#F0F0F1] dark:bg-gray-800 p-3 sm:p-4 md:p-6 min-h-[200px] max-h-[40vh] lg:max-h-none overflow-hidden">
                {String(selectedMediaInfo.mime_type || '').startsWith('image/') ? (
                  <img src={selectedMediaInfo.url} alt={selectedMediaInfo.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" onError={(e) => { e.currentTarget.src = selectedMediaInfo.thumb_url; }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <div className="mb-4 sm:mb-6 text-4xl sm:text-6xl">{getFileIcon(selectedMediaInfo.mime_type)}</div>
                    <div className="text-base sm:text-lg md:text-xl font-medium text-muted-foreground">{(selectedMediaInfo.mime_type || '').split('/')[1]?.toUpperCase() || 'FILE'}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 px-4 text-center">{selectedMediaInfo.name}</div>
                  </div>
                )}
              </div>
              <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l bg-background p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[45vh] lg:max-h-none lg:h-full pb-8">
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4">File Information</h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">File Name</label>
                        <p className="text-xs sm:text-sm mt-1 break-all" title={selectedMediaInfo.file_name}>{selectedMediaInfo.file_name}</p>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Display Name</label>
                        <p className="text-xs sm:text-sm mt-1">{selectedMediaInfo.name}</p>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">File Type</label>
                        <div className="mt-1"><Badge variant="secondary" className="text-xs">{selectedMediaInfo.mime_type}</Badge></div>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">File Size</label>
                        <p className="text-xs sm:text-sm mt-1">{formatFileSize(selectedMediaInfo.size)}</p>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Upload Date</label>
                        <p className="text-xs sm:text-sm mt-1">{new Date(selectedMediaInfo.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground block mb-2">File URL</label>
                    <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-muted rounded-md">
                      <code className="text-[10px] sm:text-xs text-muted-foreground flex-1 break-all">{selectedMediaInfo.url}</code>
                      <Button size="sm" variant="ghost" onClick={() => handleCopyLink(selectedMediaInfo.url)} className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"><Copy className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold">Actions</h3>
                    <Button onClick={() => window.open(selectedMediaInfo.url, '_blank')} className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm" variant="outline"><Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />View</Button>
                    <Button onClick={() => handleDownload(selectedMediaInfo.id, selectedMediaInfo.file_name)} className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm" variant="outline"><Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />Download</Button>
                    <Button onClick={() => requestDelete(selectedMediaInfo)} className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm" variant="destructive"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />Delete File</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mediaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" /> Delete File</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{mediaToDelete.name}</span>? The file will be permanently removed from Cloudinary and its record will be deleted. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete} disabled={!!deletingId}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
                {deletingId ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Deleting...</>) : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
