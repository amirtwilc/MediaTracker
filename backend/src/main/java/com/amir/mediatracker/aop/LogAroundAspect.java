package com.amir.mediatracker.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Aspect that logs method invocation details (arguments, return value, and exceptions)
 * for methods annotated with {@link LogAround}.
 *
 * <p><strong>Warning:</strong> Be cautious when annotating methods that handle
 * sensitive data (e.g. credentials, tokens, PII), as arguments and return values
 * may be logged.
 */
@Slf4j
@Aspect
@Component
public class LogAroundAspect {

    @Around(
            "@within(com.amir.mediatracker.aop.LogAround) || " +
                    "@annotation(com.amir.mediatracker.aop.LogAround)"
    )
    //@Around("@annotation(com.amir.mediatracker.aop.LogAround)")
    public Object logExecution(ProceedingJoinPoint pjp) throws Throwable {
        String className = pjp.getTarget().getClass().getSimpleName();
        String methodName = pjp.getSignature().getName();
        Object[] args = pjp.getArgs();

        if (args == null || args.length == 0) {
            log.info("{}::{}() started with no arguments", className, methodName);
        } else {
            log.info("{}::{}() started with args: {}", className, methodName, Arrays.toString(args));
        }

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long duration = System.currentTimeMillis() - start;


            if (result == null) {
                log.info("{}::{}({} ms) returned no response (null)", className, duration, methodName);
            } else {
                log.info("{}::{}({} ms) returned: {}", className, methodName, duration, result);
            }

            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - start;
            log.error("Exception in {}::{} ({} ms)", className, methodName, duration, ex);
            throw ex;
        }
    }
}
