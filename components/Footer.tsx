"use client"

import { Mail, Phone, ExternalLink } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-uva-navy text-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-uva-orange rounded-lg flex items-center justify-center font-serif font-bold">
                B
              </div>
              <h3 className="text-lg font-serif font-bold">Batten IT</h3>
            </div>
            <p className="text-sm text-white/80">
              Unified IT management dashboard for the Batten School at the University of Virginia.
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide">
              Contact Support
            </h4>
            <div className="space-y-2">
              <a
                href="mailto:batten-it@virginia.edu"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-uva-orange transition-colors"
              >
                <Mail className="w-4 h-4" />
                batten-it@virginia.edu
              </a>
              <a
                href="tel:+1-434-924-3900"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-uva-orange transition-colors"
              >
                <Phone className="w-4 h-4" />
                (434) 924-3900
              </a>
            </div>
          </div>

          {/* Links Section */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide">
              Quick Links
            </h4>
            <div className="space-y-2">
              <a
                href="https://www.batten.virginia.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-uva-orange transition-colors"
              >
                Batten School Website
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://virginia.service-now.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-uva-orange transition-colors"
              >
                IT Service Portal
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-uva-orange transition-colors"
              >
                Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <p className="text-sm text-white/60">
            © {currentYear} University of Virginia Batten School. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
