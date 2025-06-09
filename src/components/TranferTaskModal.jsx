import { CalendarDays, MessageSquare, User2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAllDmsActiveUser } from "../services/dashboardService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const TransferTaskModal = ({ isOpen, onTransfer, onClose }) => {
  if (!isOpen) return null;

  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    NotCompletionReason: "",
    NewUser: "",
    StartDate: "",
    CompDate: "",
    RemindTheUserOn: "",
    CreatorReminderOn: "",
  });

  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();
      const handleClose = () => onClose();
      dialog.addEventListener("close", handleClose);
      return () => {
        dialog.removeEventListener("close", handleClose);
        dialog.close();
      };
    }
  }, [onClose]);

  const fetchUsers = useCallback(async () => {
    try {
      const userDetails = await getAllDmsActiveUser(
        userData.currentUserName,
        userData.currentUserLogin,
        userData.clientURL
      );
      setUsers(Array.isArray(userDetails) ? userDetails : []);
    } catch (err) {
      console.error("Error fetching all active users:", err);
      setUsers([]);
    }
  }, [userData.currentUserName, userData.currentUserLogin, userData.clientURL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (e.target.type === "datetime-local" && value.length === 16) {
      const now = new Date();
      const seconds = String(now.getSeconds()).padStart(2, "0");
      formattedValue = `${value}:${seconds}`;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  console.table("formData", formData);

  const handleTransferClick = () => {
    onTransfer(formData);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg bg-slate-100 transition-colors dark:bg-slate-950 text-black dark:text-white p-6 w-full max-w-md"
    >
      <div className="modal-box">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Transfer Task to Another User</h3>
          <Button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Remarks Field */}
          <div className="flex flex-col gap-2 col-span-2">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <Label htmlFor="NotCompletionReason" className="text-xs">
                Remarks
              </Label>
            </div>
            <Textarea
              name="NotCompletionReason"
              id="NotCompletionReason"
              placeholder="Add remarks for not able to complete task"
              value={formData.NotCompletionReason}
              onChange={handleChange}
              className="textarea textarea-bordered textarea-xs w-full"
            />
          </div>

          {/* Transfer To Field */}
          <div className="flex flex-col gap-2 col-span-2">
            <div className="flex items-center gap-1">
              <User2 className="h-4 w-4" />
              <Label htmlFor="NewUser" className="text-xs">
                Transfer to
              </Label>
            </div>
            <select
              name="NewUser"
              id="NewUser"
              value={formData.NewUser}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            dark:focus:ring-blue-400 dark:focus:border-blue-600
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            dark:disabled:text-gray-400"
            >
              <option value="" disabled>
                Select Person
              </option>
              {users.map((user, index) => (
                <option key={index} value={user.user_name}>
                  {user.user_name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <label htmlFor="StartDate" className="text-xs">
                Start Date
              </label>
            </div>
            <Input
              type="date"
              name="StartDate"
              id="StartDate"
              value={formData.StartDate}
              onChange={handleChange}
            />
          </div>

          {/* Completion Date */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <Label htmlFor="CompDate" className="text-xs">
                Completion Date
              </Label>
            </div>
            <Input
              type="date"
              name="CompDate"
              id="CompDate"
              value={formData.CompDate}
              onChange={handleChange}
            />
          </div>

          {/* Reminder User On */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <Label htmlFor="RemindTheUserOn" className="text-xs">
                Reminder User On
              </Label>
            </div>
            <Input
              type="date"
              name="RemindTheUserOn"
              id="RemindTheUserOn"
              value={formData.RemindTheUserOn}
              onChange={handleChange}
            />
          </div>

          {/* Remind Me On */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <Label htmlFor="CreatorReminderOn" className="text-xs">
                Remind me on
              </Label>
            </div>
            <Input
              type="date"
              name="CreatorReminderOn"
              id="CreatorReminderOn"
              value={formData.CreatorReminderOn}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end w-full gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleTransferClick}>
            Transfer
          </Button>
        </div>
      </div>
    </dialog>
  );
};

export default TransferTaskModal;
