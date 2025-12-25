package com.amir.mediatracker.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Slf4j
@Aspect
@Component
public class LogAroundAspect {

    // 🎯 Pointcut: Adjust the package to match where your methods are
    @Pointcut("@annotation(com.amir.mediatracker.aop.LogAround)")
    public void serviceMethods() {}

    @Before("serviceMethods()")
    public void logRequest(JoinPoint joinPoint) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        if (args == null || args.length == 0) {
            log.info("{}::{}() called with no arguments", className, methodName);
        } else {
            log.info("{}::{}() called with args: {}", className, methodName, Arrays.toString(args));
        }
    }

    @AfterReturning(pointcut = "serviceMethods()", returning = "result")
    public void logResponse(JoinPoint joinPoint, Object result) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();

        if (result == null) {
            log.info("{}::{}() returned no response (null)", className, methodName);
        } else {
            log.info("{}::{}() returned: {}", className, methodName, result);
        }
    }

    @AfterThrowing(pointcut = "serviceMethods()", throwing = "ex")
    public void logException(JoinPoint joinPoint, Throwable ex) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        log.error("Exception in {}::{} - {}", className, methodName, ex.getMessage(), ex);
    }
}
