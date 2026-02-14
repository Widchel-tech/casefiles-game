import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Fingerprint, LayoutDashboard, FileText, Users, BarChart3, 
  LogOut, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Wand2, DollarSign
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OwnerCasesPage() {
  const { token, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    if (token) {
      fetchCases();
    }
  }, [token]);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/owner/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (caseId, publish) => {
    try {
      await axios.post(
        `${API_URL}/owner/cases/${caseId}/publish?publish=${publish}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(publish ? 'Case published' : 'Case unpublished');
      fetchCases();
    } catch (error) {
      toast.error('Failed to update case');
    }
  };

  const deleteCase = async (caseId) => {
    try {
      await axios.delete(`${API_URL}/owner/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Case deleted');
      setDeleteModal(null);
      fetchCases();
    } catch (error) {
      toast.error('Failed to delete case');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/owner/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-white" />
            <span className="font-heading text-lg tracking-widest text-white">CASE FILES</span>
          </Link>
          <div className="mt-2 font-mono text-xs text-red-500">OWNER PORTAL</div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <Link
              to="/owner/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/owner/cases"
              className="flex items-center gap-3 px-4 py-3 text-white bg-zinc-800 font-mono text-sm uppercase tracking-widest"
            >
              <FileText className="w-4 h-4" />
              Cases
            </Link>
            <Link
              to="/owner/analytics"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              to="/owner/users"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <Users className="w-4 h-4" />
              Players
            </Link>
            <Link
              to="/owner/revenue"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Revenue
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span className="font-mono text-xs uppercase tracking-widest">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl text-white uppercase tracking-wide">
                Case Manager
              </h1>
              <p className="text-zinc-500 font-mono text-sm mt-1">
                {cases.length} cases in database
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/owner/cases/generate')}
                variant="outline"
                className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none uppercase tracking-widest text-xs h-10 px-6"
                data-testid="generate-case-btn"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button
                onClick={() => navigate('/owner/cases/new')}
                className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-xs h-10 px-6"
                data-testid="create-case-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </Button>
            </div>
          </div>

          {/* Cases Table */}
          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="font-mono text-sm">Loading cases...</div>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16 border border-zinc-800 bg-zinc-900/30">
              <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-white font-heading text-xl uppercase mb-2">No Cases Yet</h3>
              <p className="text-zinc-500 mb-6">Create your first case to get started</p>
              <Button
                onClick={() => navigate('/owner/cases/new')}
                className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-xs"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Case
              </Button>
            </div>
          ) : (
            <div className="border border-zinc-800 bg-zinc-900/30">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 font-mono text-xs text-zinc-500 tracking-widest uppercase">
                <div className="col-span-2">Case ID</div>
                <div className="col-span-3">Title</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-1">Scenes</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Rows */}
              {cases.map((caseItem) => (
                <div 
                  key={caseItem.id}
                  className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 last:border-b-0 items-center hover:bg-zinc-900/50 transition-colors"
                  data-testid={`case-row-${caseItem.id}`}
                >
                  <div className="col-span-2">
                    <span className="font-mono text-emerald-500 text-sm">{caseItem.case_id}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-white font-heading uppercase">{caseItem.title}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-400 text-sm">
                      {caseItem.location_county}, {caseItem.location_state}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-zinc-400 font-mono text-sm">
                      {caseItem.scenes?.length || 0}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => togglePublish(caseItem.id, !caseItem.published)}
                      className={`flex items-center gap-2 px-3 py-1 text-xs font-mono ${
                        caseItem.published 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                      }`}
                      data-testid={`toggle-publish-${caseItem.id}`}
                    >
                      {caseItem.published ? (
                        <><CheckCircle className="w-3 h-3" /> PUBLISHED</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> DRAFT</>
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/owner/cases/${caseItem.id}`)}
                      className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                      data-testid={`edit-case-${caseItem.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/owner/cases/${caseItem.id}/validate`)}
                      className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                      data-testid={`validate-case-${caseItem.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModal(caseItem)}
                      className="text-zinc-400 hover:text-red-500 h-8 w-8 p-0"
                      data-testid={`delete-case-${caseItem.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 rounded-none">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white uppercase">
              Delete Case
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400">
            Are you sure you want to delete "{deleteModal?.title}"? This action cannot be undone.
          </p>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal(null)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteCase(deleteModal?.id)}
              className="bg-red-900 text-white hover:bg-red-800 rounded-none"
              data-testid="confirm-delete-btn"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
