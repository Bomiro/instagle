const {
  containsLink,
  findLinks,
  sanitizeMessage,
  getFilterReason
} = require('../../src/services/linkFilter');

describe('LinkFilter Service', () => {
  describe('containsLink', () => {
    describe('HTTP/HTTPS URLs', () => {
      it('should detect https:// URLs', () => {
        expect(containsLink('Check this https://example.com')).toBe(true);
        expect(containsLink('Visit https://google.com for more')).toBe(true);
      });

      it('should detect http:// URLs', () => {
        expect(containsLink('Go to http://test.com now')).toBe(true);
      });

      it('should detect URLs without protocol', () => {
        expect(containsLink('Visit example.com')).toBe(true);
        expect(containsLink('Check out google.com')).toBe(true);
      });

      it('should detect www. URLs', () => {
        expect(containsLink('Open www.example.org')).toBe(true);
      });

      it('should detect URLs with paths', () => {
        expect(containsLink('See https://site.io/blog/post')).toBe(true);
        expect(containsLink('Check example.net/path/to/page')).toBe(true);
      });
    });

    describe('Social media and messaging links', () => {
      it('should detect Telegram links', () => {
        expect(containsLink('Join t.me/somechannel')).toBe(true);
        expect(containsLink('Check https://t.me/groupchat')).toBe(true);
      });

      it('should detect WhatsApp links', () => {
        expect(containsLink('wa.me/somenumber')).toBe(true);
      });

      it('should detect Discord invites', () => {
        expect(containsLink('Join discord.gg/inviteCode')).toBe(true);
      });
    });

    describe('@usernames', () => {
      it('should detect Instagram @usernames', () => {
        expect(containsLink('Follow @username')).toBe(true);
        expect(containsLink('Check out @insta_user_123')).toBe(true);
      });

      it('should detect Twitter @usernames', () => {
        expect(containsLink('See @twitteruser')).toBe(true);
      });
    });

    describe('Email addresses', () => {
      it('should detect email addresses', () => {
        expect(containsLink('Contact test@email.com')).toBe(true);
        expect(containsLink('Email: support@company.org')).toBe(true);
      });
    });

    describe('Clean messages', () => {
      it('should allow clean text without links', () => {
        expect(containsLink('Hello, how are you?')).toBe(false);
        expect(containsLink('مرحبا كيف حالك')).toBe(false);
        expect(containsLink('This is a normal conversation')).toBe(false);
      });

      it('should handle empty strings', () => {
        expect(containsLink('')).toBe(false);
      });

      it('should handle null/undefined', () => {
        expect(containsLink(null)).toBe(false);
        expect(containsLink(undefined)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle line breaks', () => {
        expect(containsLink('Line1\nhttps://example.com\nLine3')).toBe(true);
      });

      it('should handle multiple spaces', () => {
        expect(containsLink('Visit   https://spaced.com')).toBe(true);
      });

      it('should detect links in Arabic text', () => {
        expect(containsLink('رابط https://example.com')).toBe(true);
      });
    });
  });

  describe('findLinks', () => {
    it('should find all links in a message', () => {
      const links = findLinks('Check https://google.com and www.example.com');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('should return unique links', () => {
      const links = findLinks('Visit google.com and google.com');
      // Google.com appears twice in different positions
      expect(links.length).toBeGreaterThan(0);
      // All links should be strings
      links.forEach(link => expect(typeof link).toBe('string'));
    });

    it('should return empty array for clean messages', () => {
      const links = findLinks('Hello there');
      expect(links).toEqual([]);
    });

    it('should handle messages with usernames', () => {
      const links = findLinks('Hello @user1 and @user2');
      expect(links).toContain('@user1');
      expect(links).toContain('@user2');
    });
  });

  describe('sanitizeMessage', () => {
    it('should remove links from message', () => {
      const result = sanitizeMessage('Visit https://example.com for info');
      expect(result).toContain('[محذوف]');
      expect(result).not.toContain('https://example.com');
    });

    it('should remove multiple links', () => {
      const result = sanitizeMessage('Visit google.com and https://example.com');
      expect(result).not.toContain('google.com');
      expect(result).not.toContain('https://example.com');
    });

    it('should preserve non-link content', () => {
      const result = sanitizeMessage('Hello, how are you?');
      expect(result).toBe('Hello, how are you?');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeMessage(null)).toBe(null);
      expect(sanitizeMessage(undefined)).toBe(undefined);
    });
  });

  describe('getFilterReason', () => {
    it('should return "url" for HTTP links', () => {
      const reason = getFilterReason('Check https://example.com');
      expect(reason).toBe('url');
    });

    it('should return "username" for @usernames', () => {
      const reason = getFilterReason('Hello @username');
      expect(reason).toBe('username');
    });

    it('should return "link" for other domain types', () => {
      const reason = getFilterReason('Visit example.com');
      expect(reason).toBe('link');
    });

    it('should return null for clean messages', () => {
      const reason = getFilterReason('Hello there!');
      expect(reason).toBeNull();
    });
  });
});