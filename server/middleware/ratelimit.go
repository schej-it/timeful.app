package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"schej.it/server/errs"
	"schej.it/server/responses"
)

const (
	// max burst limit, size of bucket
	missBurst = 60

	// sustained allowance after burst spent
	missesPerMinute = 20

	visitorTTL      = 10 * time.Minute
	cleanupInterval = time.Minute
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	mu       sync.Mutex
	visitors = map[string]*visitor{}
)

func init() {
	// clean up idle visitor data according to TTL
	go func() {
		for range time.Tick(cleanupInterval) {
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > visitorTTL {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

func limiterFor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	visit, ok := visitors[ip]
	if !ok {
		// effectively 3 allowance per second
		visit = &visitor{limiter: rate.NewLimiter(rate.Every(time.Minute/missesPerMinute), missBurst)}
		visitors[ip] = visit
	}
	visit.lastSeen = time.Now()

	return visit.limiter
}

func LimitEventLookupMisses() gin.HandlerFunc {
	return func(c *gin.Context) {
		limiter := limiterFor(c.ClientIP())

		if limiter.Tokens() < 1 {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, responses.Error{Error: errs.TooManyRequests})
			return
		}

		c.Next()

		// only consume limiter on 404.
		if c.Writer.Status() == http.StatusNotFound {
			limiter.Allow()
		}
	}
}
