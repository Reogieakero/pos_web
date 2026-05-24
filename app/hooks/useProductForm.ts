"use client";

import React, { useState, useTransition } from "react";
import { createProductAction } from "@/app/actions/productActions";

interface UseProductFormProps {
  onSuccessCloseDelay?: number;
  onRefreshData?: () => void;
}

export function useProductForm({ onSuccessCloseDelay = 4000, onRefreshData }: UseProductFormProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formFeedback, setFormFeedback] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64String, setBase64String] = useState<string>("");
  const [activeQrCode, setActiveQrCode] = useState<string | null>(null);

  const resetFormState = () => {
    setFormFeedback(null);
    setImagePreview(null);
    setBase64String("");
    setActiveQrCode(null);
  };

  const openModal = () => {
    resetFormState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetFormState();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        setImagePreview(resultString);
        setBase64String(resultString);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormFeedback(null);
    setActiveQrCode(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("food_image", base64String);

    startTransition(async () => {
      const result = await createProductAction(formData);
      if (result.success && result.qrCode) {
        setFormFeedback({ success: true, msg: "Food item saved successfully to store catalog!" });
        setActiveQrCode(result.qrCode);
        form.reset();
        setImagePreview(null);
        setBase64String("");

        if (onRefreshData) {
          onRefreshData();
        }

        setTimeout(() => {
          closeModal();
        }, onSuccessCloseDelay);
      } else {
        setFormFeedback({ success: false, msg: result.error || "Execution fault encountered." });
      }
    });
  };

  return {
    isModalOpen,
    openModal,
    closeModal,
    isPending,
    formFeedback,
    imagePreview,
    activeQrCode,
    handleImageChange,
    handleFormSubmit,
    setFormFeedback,
    setImagePreview,
    setBase64String,
    setActiveQrCode,
  };
}