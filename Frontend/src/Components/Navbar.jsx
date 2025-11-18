import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bounce } from "react-toastify";
import axios from "axios";
import { useAuth } from "../context/authContext";
import eye from "../assets/eye.png";
import hidden from "../assets/hidden.png";
import tick from "../assets/tick.svg";
import edit from "../assets/edit.png";
import deleteIcon from "../assets/delete.png";
import copy from "../assets/copy.svg";

const Manager = () => {
  const { logout } = useAuth();
  const eyeRef = useRef();
  const [form, setform] = useState({ site: "", username: "", password: "" });
  const [passwordArray, setPasswordArray] = useState([]);
  const [copied, setCopied] = useState({ index: null, field: null });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Track if we're in edit mode
  const [editingId, setEditingId] = useState(null);
  
  // Session-based master password (stored in memory only)
  const [sessionMasterPassword, setSessionMasterPassword] = useState("");
  const [tempMasterPassword, setTempMasterPassword] = useState("");
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [decryptedPasswords, setDecryptedPasswords] = useState({});

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/passwords");
      setPasswordArray(response.data.passwords);
    } catch (error) {
      toast.error("Failed to fetch passwords");
      console.error("Fetch passwords error:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPass(!showPass);
  };

  // Check if we have master password in session, if not request it
  const requestMasterPassword = (action) => {
    if (sessionMasterPassword) {
      // Already have it, execute immediately
      action(sessionMasterPassword);
    } else {
      // Need to ask for it
      setPendingAction(() => action);
      setShowMasterPasswordModal(true);
    }
  };

  const handleMasterPasswordSubmit = async () => {
    if (!tempMasterPassword) {
      toast.error("Please enter master password");
      return;
    }

    // Store password in session immediately
    setSessionMasterPassword(tempMasterPassword);
    setShowMasterPasswordModal(false);

    // Execute pending action
    if (pendingAction) {
      try {
        setLoading(true);
        await pendingAction(tempMasterPassword);
        setPendingAction(null);
        setTempMasterPassword("");
        
        toast.success("Master password verified!", {
          position: "top-right",
          autoClose: 2000,
          theme: "dark",
          transition: Bounce,
        });
      } catch (error) {
        // Password was wrong - clear session
        setSessionMasterPassword("");
        setTempMasterPassword("");
        setPendingAction(null);
        
        if (error.response?.status === 401) {
          toast.error("Invalid master password. Please try again.", {
            position: "top-right",
            autoClose: 3000,
            theme: "dark",
            transition: Bounce,
          });
        } else {
          toast.error(error.response?.data?.message || "Operation failed");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    // Clear session master password on logout
    setSessionMasterPassword("");
    setDecryptedPasswords({});
    logout();
  };

  const savePassword = () => {
    if (
      form.site.length < 3 ||
      form.username.length < 1 ||
      form.password.length < 1
    ) {
      toast.error("Please fill all fields correctly!", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }

    requestMasterPassword(async (masterPass) => {
      if (editingId) {
        // UPDATE existing password
        await axios.put(`/api/passwords/${editingId}`, {
          site: form.site,
          username: form.username,
          password: form.password,
          masterPassword: masterPass,
        });

        toast.success("Password Updated!", {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
          transition: Bounce,
        });
        
        setEditingId(null);
      } else {
        // CREATE new password
        await axios.post("/api/passwords", {
          site: form.site,
          username: form.username,
          password: form.password,
          masterPassword: masterPass,
        });

        toast.success("Password Saved!", {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
          transition: Bounce,
        });
      }

      setform({ site: "", username: "", password: "" });
      await fetchPasswords();
    });
  };

  const editPassword = async (id) => {
    const password = passwordArray.find((i) => i.id === id);

    requestMasterPassword(async (masterPass) => {
      const decryptResponse = await axios.post("/api/passwords/decrypt", {
        passwordId: id,
        masterPassword: masterPass,
      });

      setform({
        site: password.site,
        username: password.username,
        password: decryptResponse.data.password,
      });

      // Set editing mode
      setEditingId(id);

      toast.info("Edit mode: Update and save", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
        transition: Bounce,
      });
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setform({ site: "", username: "", password: "" });
    toast.info("Edit cancelled", {
      position: "top-right",
      autoClose: 2000,
      theme: "dark",
      transition: Bounce,
    });
  };

  const deletePassword = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this password?"
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await axios.delete(`/api/passwords/${id}`);

      toast.info("Password Deleted!", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
        transition: Bounce,
      });

      await fetchPasswords();
    } catch (error) {
      toast.error("Failed to delete password");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setform({ ...form, [e.target.name]: e.target.value });
  };

  const copyText = async (text, index, field, id) => {
    if (field === "password") {
      if (decryptedPasswords[id]) {
        // Already decrypted, just copy
        navigator.clipboard.writeText(decryptedPasswords[id]);
        setCopied({ index, field });
        toast.success("Password Copied!", {
          position: "top-right",
          autoClose: 2000,
          theme: "dark",
          transition: Bounce,
        });
        setTimeout(() => setCopied({ index: null, field: null }), 2000);
      } else {
        // Need to decrypt first
        requestMasterPassword(async (masterPass) => {
          const response = await axios.post("/api/passwords/decrypt", {
            passwordId: id,
            masterPassword: masterPass,
          });

          const decryptedPassword = response.data.password;
          
          // Cache the decrypted password
          setDecryptedPasswords(prev => ({
            ...prev,
            [id]: decryptedPassword,
          }));

          navigator.clipboard.writeText(decryptedPassword);
          setCopied({ index, field });
          toast.success("Password Copied!", {
            position: "top-right",
            autoClose: 2000,
            theme: "dark",
            transition: Bounce,
          });
          setTimeout(() => setCopied({ index: null, field: null }), 2000);
        });
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopied({ index, field });
      toast.success("Copied to Clipboard!", {
        position: "top-right",
        autoClose: 2000,
        theme: "dark",
        transition: Bounce,
      });
      setTimeout(() => setCopied({ index: null, field: null }), 2000);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
        transition={Bounce}
      />

      {/* Master Password Modal - Only shows once per session */}
      {showMasterPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Enter Master Password
            </h3>
            <p className="text-gray-600 mb-4">
              Your master password is required for this session
            </p>
            <input
              type="password"
              value={tempMasterPassword}
              onChange={(e) => setTempMasterPassword(e.target.value)}
              placeholder="Master Password"
              className="w-full px-4 py-3 rounded-lg border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              onKeyPress={(e) =>
                e.key === "Enter" && handleMasterPasswordSubmit()
              }
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleMasterPasswordSubmit}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Confirm"}
              </button>
              <button
                onClick={() => {
                  setShowMasterPasswordModal(false);
                  setTempMasterPassword("");
                  setPendingAction(null);
                }}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 You'll only need to enter this once per session
            </p>
          </div>
        </div>
      )}

      <div className="w-full px-2 sm:px-5 py-2 mt-5 mb-5">
        <div className="max-w-5xl mx-auto rounded-2xl p-4 sm:p-6 bg-white shadow-2xl ring-2 ring-indigo-500/50">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">
              <span className="text-indigo-600">&lt;</span>
              VaultX
              <span className="text-indigo-600">/&gt;</span>
            </h1>
            <div className="flex items-center gap-3">
              {sessionMasterPassword && (
                <span className="text-sm font-semibold text-green-600 hidden sm:block">
                  🔓 Session Active
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
              >
                Logout
              </button>
            </div>
          </div>

          <p className="font-medium py-2 text-lg text-indigo-700 text-center px-2">
            Never hit 'Forgot Password?' again. Your keys, your vault, your
            digital freedom – all in one tap.
          </p>

          {loading && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {/* Edit Mode Banner */}
          {editingId && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-yellow-700 font-semibold">
                    ✏️ Edit Mode: Update the fields below and click "Update Password"
                  </span>
                </div>
                <button
                  onClick={cancelEdit}
                  className="text-yellow-700 hover:text-yellow-900 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col p-4 text-black gap-6 items-stretch w-full">
            <input
              value={form.site}
              onChange={handleChange}
              placeholder="Enter Website URL"
              className="rounded-full border border-indigo-400 w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              type="text"
              name="site"
              id="site"
            />

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <input
                value={form.username}
                onChange={handleChange}
                placeholder="Enter Username"
                className="rounded-full border border-indigo-400 sm:w-1/2 w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                type="text"
                name="username"
                id="username"
              />

              <div className="relative sm:w-1/2 w-full">
                <input
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter Password"
                  className="rounded-full border border-indigo-400 w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  type={showPass ? "text" : "password"}
                  name="password"
                  id="password"
                />
                <span
                  className="absolute right-4 top-2.5 cursor-pointer"
                  onClick={togglePasswordVisibility}
                >
                  <img
                    ref={eyeRef}
                    width={20}
                    height={20}
                    src={showPass ? eye : hidden}
                    alt="eye"
                  />
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={savePassword}
                disabled={loading}
                className={`cursor-pointer flex justify-center items-center gap-2 text-lg font-semibold ${
                  editingId ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-indigo-500 hover:bg-indigo-400'
                } transition-all duration-300 rounded-full px-6 py-2 w-full sm:w-fit border border-black disabled:opacity-50`}
              >
                <span>{editingId ? "Update Password" : "Add Password"}</span>
              </button>
              
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="cursor-pointer flex justify-center items-center gap-2 text-lg font-semibold bg-gray-400 hover:bg-gray-500
                           transition-all duration-300 rounded-full px-6 py-2 w-full sm:w-fit border border-black"
                >
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          <div className="passwords mt-8">
            <h2 className="text-xl font-bold p-4">Your Saved Passwords</h2>

            {passwordArray.length === 0 && !loading && (
              <div className="px-5 text-lg text-gray-600">
                No Passwords Saved
              </div>
            )}

            {passwordArray.length !== 0 && (
              <div className="overflow-x-auto w-full">
                <table className="min-w-[700px] sm:min-w-full table-auto rounded-md overflow-hidden mb-8 text-xs sm:text-base">
                  <thead className="text-center bg-indigo-600 text-white">
                    <tr>
                      <th className="py-2 px-2 whitespace-nowrap">Website</th>
                      <th className="py-2 px-2 whitespace-nowrap">Username</th>
                      <th className="py-2 px-2 whitespace-nowrap">Password</th>
                      <th className="py-2 px-2 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-center bg-indigo-50 border border-white">
                    {passwordArray.map((item, index) => (
                      <tr key={item.id} className={editingId === item.id ? 'bg-yellow-100' : ''}>
                        <td className="py-2 px-1 border border-white text-xs sm:text-sm">
                          <div className="relative flex items-center justify-center group">
                            <a
                              href={item.site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer hover:text-blue-600 hover:underline break-all"
                            >
                              {item.site}
                            </a>
                            <div
                              className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                              onClick={() =>
                                copyText(item.site, index, "site", item.id)
                              }
                            >
                              <img
                                width={16}
                                height={16}
                                src={
                                  copied.index === index &&
                                  copied.field === "site"
                                    ? tick
                                    : copy
                                }
                                alt="Copy"
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-1 border border-white text-xs sm:text-sm">
                          <div className="relative flex items-center justify-center group">
                            <span>{item.username}</span>
                            <div
                              className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                              onClick={() =>
                                copyText(
                                  item.username,
                                  index,
                                  "username",
                                  item.id
                                )
                              }
                            >
                              <img
                                width={16}
                                height={16}
                                src={
                                  copied.index === index &&
                                  copied.field === "username"
                                    ? tick
                                    : copy
                                }
                                alt="Copy"
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-1 border border-white text-xs sm:text-sm">
                          <div className="relative flex items-center justify-center group">
                            <span>{"*".repeat(8)}</span>
                            <div
                              className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                              onClick={() =>
                                copyText(null, index, "password", item.id)
                              }
                            >
                              <img
                                width={16}
                                height={16}
                                src={
                                  copied.index === index &&
                                  copied.field === "password"
                                    ? tick
                                    : copy
                                }
                                alt="Copy"
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-1 border border-white">
                          <div className="flex gap-2 items-center justify-center cursor-pointer">
                            <img
                              className="size-4.5 hover:scale-110 transition-all duration-300"
                              onClick={() => editPassword(item.id)}
                              src={edit}
                              alt="edit"
                            />
                            <img
                              className="size-3.5 hover:scale-110 transition-all duration-300"
                              onClick={() => deletePassword(item.id)}
                              src={deleteIcon}
                              alt="delete"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Manager;