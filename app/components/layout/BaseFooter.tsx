"use client";

import { useTranslationContext } from "@/contexts/TranslationContext";

// Variables
import { AUTHOR_GITHUB } from "@/lib/variables";

const BaseFooter = () => {
    const { _t } = useTranslationContext();

    return (
        <footer className="container py-10">
            <p>
                {_t("")}{" "}
                <a
                    href={}
                    target="_blank"
                    style={{ textDecoration: "underline" }}
                >
                    
                </a>
            </p>
        </footer>
    );
};

export default BaseFooter;
